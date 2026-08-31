import bcrypt from "bcryptjs";
import { User } from "./user.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

const hash = (v: string): string => bcrypt.hashSync(v, 10);

type Actor = { id?: string; role?: string };

export const listUsers = async (input: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
  sort?: string;
  order?: string;
  includeDeleted?: boolean;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = {};

  if (!input.includeDeleted) filter.deletedAt = null;
  if (input.role) filter.role = input.role;
  if (input.status === "active") filter.isActive = true;
  if (input.status === "inactive") filter.isActive = false;

  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: q }, { email: q }, { phone: q }];
  }

  const sortDir = input.order === "asc" ? 1 : -1;
  const sortField = ["name", "email", "role", "createdAt"].includes(input.sort ?? "")
    ? (input.sort as string)
    : "createdAt";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sort: any = { [sortField]: sortDir, _id: 1 };

  const total = await User.countDocuments(filter);
  const docs = await User.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    users: docs.map((d) => safeUser(d)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUserById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const user = await User.findOne(filter).lean();
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  return safeUser(user);
};

export const createUser = async (
  input: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string | null;
    language?: string;
    avatarKey?: string | null;
  },
  actor: Actor = {}
): Promise<unknown> => {
  const email = input.email.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) throw AppError.conflict("Email already registered", "EMAIL_IN_USE");

  const role = input.role || "PASSENGER";
  const user = await User.create({
    name: input.name,
    email,
    phone: input.phone ?? null,
    password: hash(input.password),
    role,
    language: input.language || "en",
    avatarKey: input.avatarKey ?? null,
    isActive: true,
  });

  await AuditLog.create({
    actorId: actor.id ?? null,
    actorRole: actor.role ?? null,
    action: "user.create",
    resource: "user",
    resourceId: user._id.toString(),
    meta: { role, email },
    severity: "WARN",
  });

  return safeUser(user.toObject());
};

export const updateUser = async (
  id: string,
  input: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    phone?: string | null;
    language?: string;
    avatarKey?: string | null;
    isActive?: boolean;
  },
  actor: Actor = {}
): Promise<unknown> => {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  if (input.email) {
    const email = input.email.toLowerCase();
    const clash = await User.findOne({ email, _id: { $ne: id } });
    if (clash) throw AppError.conflict("Email already registered", "EMAIL_IN_USE");
    user.email = email;
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.language !== undefined) user.language = input.language;
  if (input.avatarKey !== undefined) user.avatarKey = input.avatarKey;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  if (input.password) user.password = hash(input.password);
  if (input.role) {
    if (user.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw AppError.forbidden("Only SUPER_ADMIN may change a SUPER_ADMIN role", "FORBIDDEN");
    }
    user.role = input.role;
  }

  await user.save();

  await AuditLog.create({
    actorId: actor.id ?? null,
    actorRole: actor.role ?? null,
    action: "user.update",
    resource: "user",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return safeUser(user.toObject());
};

export const setUserStatus = async (
  id: string,
  status: "activate" | "deactivate",
  actor: Actor = {}
): Promise<unknown> => {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  if (user.role === "SUPER_ADMIN" && status === "deactivate") {
    throw AppError.forbidden("Cannot deactivate a SUPER_ADMIN account", "FORBIDDEN");
  }
  if (actor.id && id === actor.id && status === "deactivate") {
    throw AppError.forbidden("Cannot deactivate your own account", "FORBIDDEN");
  }

  if (status === "activate") {
    user.isActive = true;
    user.deletedAt = null;
  } else {
    user.isActive = false;
    user.deletedAt = new Date();
  }
  await user.save();

  await AuditLog.create({
    actorId: actor.id ?? null,
    actorRole: actor.role ?? null,
    action: `user.${status}`,
    resource: "user",
    resourceId: id,
    meta: { role: user.role },
    severity: status === "deactivate" ? "WARN" : "INFO",
  });

  return safeUser(user.toObject());
};

export const removeUser = async (id: string, actor: Actor = {}): Promise<void> => {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  if (user.role === "SUPER_ADMIN") {
    throw AppError.forbidden("Cannot delete a SUPER_ADMIN account", "FORBIDDEN");
  }
  if (actor.id && id === actor.id) {
    throw AppError.forbidden("Cannot delete your own account", "FORBIDDEN");
  }
  await user.deleteOne();

  await AuditLog.create({
    actorId: actor.id ?? null,
    actorRole: actor.role ?? null,
    action: "user.delete",
    resource: "user",
    resourceId: id,
    meta: { role: user.role },
    severity: "WARN",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeUser = (doc: any): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    _id: doc._id?.toString?.() ?? doc._id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone ?? null,
    language: doc.language ?? "en",
    avatarKey: doc.avatarKey ?? null,
    isActive: doc.isActive,
    deletedAt: doc.deletedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  return out;
};
