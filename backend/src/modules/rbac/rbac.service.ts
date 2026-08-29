import { Role, Permission } from "../../models/role.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { ALL_ROLES } from "../../constants/roles.js";

export const listPermissions = async (): Promise<unknown[]> => {
  const docs = await Permission.find({}).sort({ code: 1 }).lean();
  return docs.map((d) => ({ code: d.code, name: d.name, description: d.description }));
};

export const listRoles = async (): Promise<unknown[]> => {
  const docs = await Role.find({}).sort({ code: 1 }).lean();
  return docs.map((d) => ({
    code: d.code,
    name: d.name,
    description: d.description,
    permissions: d.permissions,
    isSystem: d.isSystem,
  }));
};

export const getRole = async (code: string): Promise<unknown> => {
  const role = await Role.findOne({ code: code.toUpperCase() }).lean();
  if (!role) throw AppError.notFound("Role not found", "ROLE_NOT_FOUND");
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
  };
};

export const seedRoleIfMissing = async (code: string, permissions: string[]): Promise<void> => {
  if (!ALL_ROLES.includes(code)) return;
  await Role.updateOne(
    { code },
    {
      $setOnInsert: {
        code,
        name: code.replace(/_/g, " "),
        description: "",
        permissions,
        isSystem: true,
      },
    },
    { upsert: true }
  );
};

export const setRolePermissions = async (
  input: { code: string; permissions: string[] },
  actor: { id?: string; role?: string } = {}
): Promise<unknown> => {
  const code = input.code.toUpperCase();
  const role = await Role.findOne({ code });
  if (!role) throw AppError.notFound("Role not found", "ROLE_NOT_FOUND");
  if (role.isSystem && !(actor.role === "SUPER_ADMIN" || actor.role === "ADMIN")) {
    throw AppError.forbidden("Cannot modify a system role", "SYSTEM_ROLE");
  }

  const valid = await Permission.find({ code: { $in: input.permissions } }).lean();
  const validCodes = valid.map((p) => p.code);
  role.permissions = validCodes;
  await role.save();

  await AuditLog.create({
    actorId: actor.id ?? null,
    actorRole: actor.role ?? null,
    action: "role.permissions.update",
    resource: "role",
    resourceId: code,
    meta: { permissions: validCodes },
    severity: "WARN",
  });

  return getRole(code);
};

export const createRole = async (input: {
  code: string;
  name: string;
  description?: string;
  permissions?: string[];
}): Promise<unknown> => {
  const code = input.code.toUpperCase();
  const exists = await Role.findOne({ code });
  if (exists) throw AppError.conflict("Role already exists", "ROLE_EXISTS");

  const role = await Role.create({
    code,
    name: input.name,
    description: input.description || "",
    permissions: input.permissions || [],
    isSystem: false,
  });
  return getRole(code);
};

export const deleteRole = async (code: string): Promise<void> => {
  const role = await Role.findOne({ code: code.toUpperCase() });
  if (!role) throw AppError.notFound("Role not found", "ROLE_NOT_FOUND");
  if (role.isSystem) throw AppError.forbidden("Cannot delete a system role", "SYSTEM_ROLE");
  await role.deleteOne();
};
