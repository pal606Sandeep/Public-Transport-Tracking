import { Types } from "mongoose";
import { MaintenanceRecord, IMaintenanceRecord, MaintenanceType, MaintenanceStatus } from "./maintenance.model.js";
import {
  VehicleDocument,
  IVehicleDocument,
  VehicleDocumentType,
  VehicleDocumentStatus,
} from "./vehicle-document.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { AppError } from "../../utils/AppError.js";

// Documents expiring within this window are flagged EXPIRING and trigger a reminder.
export const EXPIRY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

const toDate = (v?: string | number | Date | null): Date | null | undefined =>
  v === undefined || v === null || v === "" ? (v as Date | null | undefined) : new Date(v);

const daysBetween = (from: Date, to: Date): number => Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

const computeDocumentStatus = (expiresAt?: Date | null, now = Date.now()): VehicleDocumentStatus => {
  if (!expiresAt) return "VALID";
  const delta = expiresAt.getTime() - now;
  if (delta < 0) return "EXPIRED";
  if (delta <= EXPIRY_WINDOW_MS) return "EXPIRING";
  return "VALID";
};

const ensureVehicle = async (vehicleId: string): Promise<void> => {
  const v = await Vehicle.findOne({ _id: vehicleId, deletedAt: null });
  if (!v) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
};

// ---------------------------------------------------------------------------
// Maintenance records
// ---------------------------------------------------------------------------

export type MaintenanceInput = {
  type: MaintenanceType;
  title: string;
  description?: string | null;
  status?: MaintenanceStatus;
  scheduledDate?: Date | null;
  cost?: number | null;
  odometerKm?: number | null;
  provider?: string | null;
  parts?: { name: string; quantity: number; cost: number }[];
};

export const serializeMaintenance = (d: IMaintenanceRecord): Record<string, unknown> => {
  const doc = d as IMaintenanceRecord & { _id: unknown; createdAt?: Date; updatedAt?: Date };
  return {
    _id: (doc._id as Types.ObjectId)?.toString?.(),
    vehicle: (doc.vehicle as unknown as Types.ObjectId)?.toString?.(),
    type: doc.type,
    title: doc.title,
    description: doc.description ?? null,
    status: doc.status,
    scheduledDate: doc.scheduledDate ?? null,
    completedAt: doc.completedAt ?? null,
    cost: doc.cost ?? null,
    odometerKm: doc.odometerKm ?? null,
    provider: doc.provider ?? null,
    parts: doc.parts ?? [],
    notes: doc.notes ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

export const listMaintenance = async (vehicleId: string, input: { page: number; limit: number; status?: string }): Promise<unknown> => {
  await ensureVehicle(vehicleId);
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { vehicle: new Types.ObjectId(vehicleId), deletedAt: null };
  if (input.status) filter.status = input.status;
  const total = await MaintenanceRecord.countDocuments(filter);
  const docs = await MaintenanceRecord.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { records: docs.map(serializeMaintenance), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const createMaintenance = async (vehicleId: string, input: MaintenanceInput): Promise<unknown> => {
  await ensureVehicle(vehicleId);
  const doc = await MaintenanceRecord.create({
    vehicle: new Types.ObjectId(vehicleId),
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "SCHEDULED",
    scheduledDate: input.scheduledDate ?? null,
    cost: input.cost ?? null,
    odometerKm: input.odometerKm ?? null,
    provider: input.provider ?? null,
    parts: input.parts ?? [],
  });
  return serializeMaintenance(doc.toObject());
};

export const getMaintenance = async (vehicleId: string, id: string): Promise<unknown> => {
  const doc = await MaintenanceRecord.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId), deletedAt: null }).lean();
  if (!doc) throw AppError.notFound("Maintenance record not found", "MAINTENANCE_NOT_FOUND");
  return serializeMaintenance(doc);
};

export const updateMaintenance = async (vehicleId: string, id: string, input: Partial<MaintenanceInput>): Promise<unknown> => {
  const doc = await MaintenanceRecord.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId), deletedAt: null });
  if (!doc) throw AppError.notFound("Maintenance record not found", "MAINTENANCE_NOT_FOUND");
  const allowed: (keyof MaintenanceInput)[] = ["type", "title", "description", "status", "scheduledDate", "cost", "odometerKm", "provider", "parts"];
  for (const k of allowed) {
    const val = input[k];
    if (val !== undefined) doc.set(k, val);
  }
  await doc.save();
  return serializeMaintenance(doc.toObject());
};

export const completeMaintenance = async (vehicleId: string, id: string): Promise<unknown> => {
  const doc = await MaintenanceRecord.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId), deletedAt: null });
  if (!doc) throw AppError.notFound("Maintenance record not found", "MAINTENANCE_NOT_FOUND");
  if (doc.status === "COMPLETED") throw AppError.conflict("Maintenance already completed", "ALREADY_COMPLETED");
  doc.status = "COMPLETED";
  doc.completedAt = new Date();
  await doc.save();
  return serializeMaintenance(doc.toObject());
};

export const deleteMaintenance = async (vehicleId: string, id: string): Promise<void> => {
  const doc = await MaintenanceRecord.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId), deletedAt: null });
  if (!doc) throw AppError.notFound("Maintenance record not found", "MAINTENANCE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
};

// ---------------------------------------------------------------------------
// Vehicle documents
// ---------------------------------------------------------------------------

export type VehicleDocumentInput = {
  type: VehicleDocumentType;
  documentNumber: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  attachmentKey?: string | null;
};

export const serializeDocument = (d: IVehicleDocument): Record<string, unknown> => {
  const doc = d as IVehicleDocument & { _id: unknown; createdAt?: Date; updatedAt?: Date };
  return {
    _id: (doc._id as Types.ObjectId)?.toString?.(),
    vehicle: (doc.vehicle as unknown as Types.ObjectId)?.toString?.(),
    type: doc.type,
    documentNumber: doc.documentNumber,
    issuedAt: doc.issuedAt ?? null,
    expiresAt: doc.expiresAt ?? null,
    status: doc.status,
    daysLeft: doc.expiresAt && doc.status !== "EXPIRED" ? daysBetween(new Date(), doc.expiresAt) : 0,
    attachmentKey: doc.attachmentKey ?? null,
    reminderSentAt: doc.reminderSentAt ?? null,
  };
};

export const listDocuments = async (vehicleId: string, input: { status?: string }): Promise<unknown> => {
  await ensureVehicle(vehicleId);
  const filter: Record<string, unknown> = { vehicle: new Types.ObjectId(vehicleId) };
  if (input.status) filter.status = input.status;
  const docs = await VehicleDocument.find(filter).sort({ type: 1 }).lean();
  return { documents: docs.map(serializeDocument) };
};

export const createDocument = async (vehicleId: string, input: VehicleDocumentInput): Promise<unknown> => {
  await ensureVehicle(vehicleId);
  const existing = await VehicleDocument.findOne({ vehicle: new Types.ObjectId(vehicleId), type: input.type });
  if (existing) throw AppError.conflict("A document of this type already exists for the vehicle", "DOCUMENT_EXISTS");
  const expiresAt = toDate(input.expiresAt) ?? null;
  const status = computeDocumentStatus(expiresAt ?? undefined);
  const doc = await VehicleDocument.create({
    vehicle: new Types.ObjectId(vehicleId),
    type: input.type,
    documentNumber: input.documentNumber,
    issuedAt: toDate(input.issuedAt) ?? null,
    expiresAt,
    status,
    attachmentKey: input.attachmentKey ?? null,
  });
  return serializeDocument(doc.toObject());
};

export const getDocument = async (vehicleId: string, id: string): Promise<unknown> => {
  const doc = await VehicleDocument.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId) }).lean();
  if (!doc) throw AppError.notFound("Vehicle document not found", "DOCUMENT_NOT_FOUND");
  return serializeDocument(doc);
};

export const updateDocument = async (vehicleId: string, id: string, input: Partial<VehicleDocumentInput>): Promise<unknown> => {
  const doc = await VehicleDocument.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId) });
  if (!doc) throw AppError.notFound("Vehicle document not found", "DOCUMENT_NOT_FOUND");
  if (input.type !== undefined && input.type !== doc.type) {
    const clash = await VehicleDocument.findOne({ vehicle: new Types.ObjectId(vehicleId), type: input.type });
    if (clash) throw AppError.conflict("A document of this type already exists for the vehicle", "DOCUMENT_EXISTS");
    doc.type = input.type;
  }
  if (input.documentNumber !== undefined) doc.documentNumber = input.documentNumber;
  if (input.issuedAt !== undefined) doc.issuedAt = toDate(input.issuedAt) ?? null;
  if (input.expiresAt !== undefined) doc.expiresAt = toDate(input.expiresAt) ?? null;
  if (input.attachmentKey !== undefined) doc.attachmentKey = input.attachmentKey;
  doc.status = computeDocumentStatus(doc.expiresAt);
  await doc.save();
  return serializeDocument(doc.toObject());
};

export const deleteDocument = async (vehicleId: string, id: string): Promise<void> => {
  const doc = await VehicleDocument.findOne({ _id: id, vehicle: new Types.ObjectId(vehicleId) });
  if (!doc) throw AppError.notFound("Vehicle document not found", "DOCUMENT_NOT_FOUND");
  await doc.deleteOne();
};

// ---------------------------------------------------------------------------
// Expiry + service-due jobs (reminders)
// ---------------------------------------------------------------------------

export type MaintenanceJobResult = {
  checkedAt: number;
  documentCheck: {
    total: number;
    flagged: number;
    items: { type: string; status: VehicleDocumentStatus; reminderSentAt: Date | null }[];
  };
  serviceDue: { recordId: string; title: string; type: MaintenanceType; scheduledDate: Date | null }[];
};

/**
 * P1-48 — reminder job. Re-evaluates every document's status against its
 * expiry (flagging EXPIRING within the window / EXPIRED past due, setting a
 * one-shot reminderSentAt) and lists service records due / overdue.
 */
export const runMaintenanceJobs = async (a?: { id?: string; role?: string }): Promise<MaintenanceJobResult> => {
  const now = Date.now();

  const docs = await VehicleDocument.find({}).lean();
  const flaggedItems: MaintenanceJobResult["documentCheck"]["items"] = [];
  for (const d of docs) {
    const status = computeDocumentStatus(d.expiresAt, now);
    let reminderSentAt = d.reminderSentAt ?? null;
    if (status !== "VALID" && !d.reminderSentAt) {
      reminderSentAt = new Date(now);
      await VehicleDocument.updateOne({ _id: d._id }, { $set: { status, reminderSentAt } });
    } else if (d.status !== status) {
      await VehicleDocument.updateOne({ _id: d._id }, { $set: { status } });
    }
    flaggedItems.push({ type: d.type, status, reminderSentAt });
  }

  const dueServiceThreshold = now + 7 * 24 * 60 * 60 * 1000;
  const serviceDocs = await MaintenanceRecord.find({
    deletedAt: null,
    status: { $in: ["SCHEDULED", "IN_PROGRESS"] },
    scheduledDate: { $ne: null, $lte: new Date(dueServiceThreshold) },
  })
    .sort({ scheduledDate: 1 })
    .lean();
  const serviceDue = serviceDocs.map((s) => ({
    recordId: s._id.toString(),
    title: s.title,
    type: s.type,
    scheduledDate: s.scheduledDate ?? null,
  }));

  if (flaggedItems.length || serviceDue.length) {
    await import("../../models/auditLog.model.js").then(({ AuditLog }) =>
      AuditLog.create({
        ...actor(a),
        action: "maintenance.jobs",
        resource: "maintenance",
        meta: { documentsFlagged: flaggedItems.length, serviceDue: serviceDue.length },
        severity: "WARN",
      })
    );
  }

  return {
    checkedAt: now,
    documentCheck: { total: docs.length, flagged: flaggedItems.length, items: flaggedItems },
    serviceDue,
  };
};

// ---------------------------------------------------------------------------
// Vehicle health surfaced on vehicle reads
// ---------------------------------------------------------------------------

export const vehicleHealth = async (
  vehicleId: string
): Promise<{ documents: { type: string; status: VehicleDocumentStatus; expiresAt: Date | null; daysLeft: number | null }[]; serviceDue: boolean }> => {
  const docs = await VehicleDocument.find({ vehicle: new Types.ObjectId(vehicleId) }).lean();
  const now = Date.now();
  const documents = docs.map((d) => ({
    type: d.type,
    status: computeDocumentStatus(d.expiresAt, now),
    expiresAt: d.expiresAt ?? null,
    daysLeft: d.expiresAt ? Math.ceil((d.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000)) : null,
  }));
  const serviceDue = await MaintenanceRecord.exists({
    vehicle: new Types.ObjectId(vehicleId),
    deletedAt: null,
    status: { $in: ["SCHEDULED", "IN_PROGRESS"] },
    scheduledDate: { $ne: null, $lte: new Date(now + 7 * 24 * 60 * 60 * 1000) },
  });
  return { documents, serviceDue: Boolean(serviceDue) };
};
