import { SystemSetting } from "../../models/systemSetting.model.js";
import { AppError } from "../../utils/AppError.js";

/**
 * Thresholds that the rest of the system depends on. Validation is enforced
 * here so a bad admin write can't break the dispatcher / journey planner.
 */
const THRESHOLD_RANGES: Record<string, (v: unknown) => string | null> = {
  gpsSendIntervalSeconds: (v) => {
    if (typeof v !== "number" || v < 1 || v > 600) return "must be 1..600 seconds";
    return null;
  },
  geofenceRadiusMeters: (v) => {
    if (typeof v !== "number" || v < 10 || v > 5000) return "must be 10..5000 meters";
    return null;
  },
  offlineVehicleTimeoutSeconds: (v) => {
    if (typeof v !== "number" || v < 10 || v > 3600) return "must be 10..3600 seconds";
    return null;
  },
  etaThresholds: (v) => {
    if (!v || typeof v !== "object") return "must be an object {low, medium, high}";
    const o = v as { low?: unknown; medium?: unknown; high?: unknown };
    if (
      typeof o.low !== "number" ||
      typeof o.medium !== "number" ||
      typeof o.high !== "number" ||
      !(o.low < o.medium && o.medium < o.high)
    )
      return "low < medium < high required";
    return null;
  },
  delayThresholds: (v) => {
    if (!v || typeof v !== "object") return "must be an object {onTime, delayed, severe}";
    const o = v as { onTime?: unknown; delayed?: unknown; severe?: unknown };
    if (
      typeof o.onTime !== "number" ||
      typeof o.delayed !== "number" ||
      typeof o.severe !== "number" ||
      !(o.onTime <= o.delayed && o.delayed <= o.severe)
    )
      return "onTime <= delayed <= severe required";
    return null;
  },
  featureFlags: (v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return "must be an object";
    return null;
  },
  supportedLanguages: (v) => {
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !x))
      return "must be an array of non-empty strings";
    return null;
  },
  mapTileSource: (v) => {
    if (typeof v !== "string" || !v) return "must be a non-empty string";
    return null;
  },
  minSupportedAppVersion: (v) => {
    if (typeof v !== "string" || !/^\d+\.\d+\.\d+$/.test(v))
      return "must be a semver string (e.g. 1.2.3)";
    return null;
  },
  checklistBlocksTripStart: (v) => {
    if (typeof v !== "boolean") return "must be boolean";
    return null;
  },
};

const validateValue = (key: string, value: unknown): void => {
  const v = THRESHOLD_RANGES[key]?.(value);
  if (v) throw AppError.badRequest(`Invalid setting ${key}: ${v}`, "INVALID_SETTING_VALUE");
};

const serialize = (d: Record<string, unknown>) => ({
  key: d.key as string,
  value: d.value,
  description: (d.description as string) ?? "",
  updatedAt: (d.updatedAt as Date).toISOString(),
  createdAt: (d.createdAt as Date).toISOString(),
});

const actor = (a: { id?: string; role?: string }) => ({
  actorId: a.id,
  actorRole: a.role,
});

const writeAudit = async (
  a: { id?: string; role?: string },
  action: string,
  key: string,
  before: unknown,
  after: unknown
): Promise<void> => {
  const { AuditLog } = await import("../../models/auditLog.model.js");
  await AuditLog.create({
    ...actor(a),
    action,
    resource: "system_setting",
    resourceId: key,
    meta: { before, after },
    severity: action.endsWith(".delete") ? "WARN" : "INFO",
  });
};

export interface ListFilter {
  q?: string;
  page?: number;
  limit?: number;
}

export const listSettings = async (f: ListFilter) => {
  const page = Number(f.page ?? 1);
  const limit = Math.min(Number(f.limit ?? 50), 100);
  const filter: Record<string, unknown> = {};
  if (f.q) filter.key = { $regex: f.q, $options: "i" };
  const total = await SystemSetting.countDocuments(filter);
  const docs = await SystemSetting.find(filter)
    .sort({ key: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return {
    settings: docs.map((d) => serialize(d as unknown as Record<string, unknown>)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getSetting = async (key: string) => {
  const doc = await SystemSetting.findOne({ key }).lean();
  if (!doc) throw AppError.notFound("Setting not found", "SETTING_NOT_FOUND");
  return serialize(doc as unknown as Record<string, unknown>);
};

export const createSetting = async (
  input: { key: string; value: unknown; description?: string },
  a: { id?: string; role?: string }
) => {
  validateValue(input.key, input.value);
  const exists = await SystemSetting.findOne({ key: input.key }).lean();
  if (exists) throw AppError.conflict("Setting already exists", "SETTING_EXISTS");
  const doc = await SystemSetting.create({
    key: input.key,
    value: input.value,
    description: input.description ?? "",
  });
  await writeAudit(a, "system_setting.create", input.key, null, input.value);
  return serialize(doc.toObject() as unknown as Record<string, unknown>);
};

export const updateSetting = async (
  key: string,
  input: { value: unknown; description?: string },
  a: { id?: string; role?: string }
) => {
  validateValue(key, input.value);
  const before = await SystemSetting.findOne({ key }).lean();
  if (!before) throw AppError.notFound("Setting not found", "SETTING_NOT_FOUND");
  const update: Record<string, unknown> = { value: input.value };
  if (typeof input.description === "string") update.description = input.description;
  const doc = await SystemSetting.findOneAndUpdate({ key }, update, { new: true }).lean();
  await writeAudit(a, "system_setting.update", key, before?.value, input.value);
  return serialize(doc as unknown as Record<string, unknown>);
};

export const removeSetting = async (key: string, a: { id?: string; role?: string }) => {
  const before = await SystemSetting.findOneAndDelete({ key }).lean();
  if (!before) throw AppError.notFound("Setting not found", "SETTING_NOT_FOUND");
  await writeAudit(a, "system_setting.delete", key, before.value, null);
};

export const bulkUpsert = async (
  settings: { key: string; value: unknown; description?: string }[],
  a: { id?: string; role?: string }
) => {
  const results: { key: string; status: "created" | "updated" }[] = [];
  for (const s of settings) {
    validateValue(s.key, s.value);
    const exists = await SystemSetting.findOne({ key: s.key }).lean();
    if (exists) {
      await SystemSetting.updateOne(
        { key: s.key },
        { value: s.value, ...(typeof s.description === "string" ? { description: s.description } : {}) }
      );
      results.push({ key: s.key, status: "updated" });
    } else {
      await SystemSetting.create({ key: s.key, value: s.value, description: s.description ?? "" });
      results.push({ key: s.key, status: "created" });
    }
  }
  await writeAudit(a, "system_setting.bulk_upsert", "bulk", null, settings.map((s) => s.key));
  return { results, count: results.length };
};