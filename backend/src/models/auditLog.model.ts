import mongoose from "mongoose";

/**
 * Audit log for important actions (role/permission mapping changes, admin
 * actions, security events, deletes, etc.).
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    resource: { type: String, default: "" },
    resourceId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    severity: { type: String, enum: ["INFO", "WARN", "SECURITY"], default: "INFO" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
