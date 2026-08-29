import mongoose from "mongoose";

/**
 * Role definition. `permissions` holds the granted permission codes
 * (role→permissions embedded on the role, per the RBAC design).
 */
const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model("Role", roleSchema);

/**
 * Permission definition (verbs usually combined with a resource at runtime,
 * e.g. `CREATE:user`). Core verbs are stored here; resource scoping is handled
 * by the `authorize(permission, resource?)` guard.
 */
const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Permission = mongoose.model("Permission", permissionSchema);
