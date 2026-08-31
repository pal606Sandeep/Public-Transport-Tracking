import { createHmac, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import { AppError } from "../../utils/AppError.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { UPLOAD_CONFIG, UPLOAD_PURPOSES, UploadPurpose } from "./uploads.validation.js";

const SECRET = process.env.UPLOAD_SIGNING_SECRET || "dev-upload-signing-secret-change-me";
const EXPIRY_SECONDS = Number(process.env.UPLOAD_URL_TTL || 300);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "transit-uploads");

const mimeExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

const sign = (key: string, purpose: UploadPurpose, expires: number): string =>
  createHmac("sha256", SECRET).update(`${key}|${purpose}|${expires}`).digest("hex");

const safeKey = (key: string): string => {
  const parts = key.split("/").filter(Boolean);
  if (parts.length < 2 || !parts[0]) throw AppError.badRequest("Malformed object key", "BAD_KEY");
  return path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
};

export const presignUpload = async (
  purpose: UploadPurpose,
  contentType: string,
  sizeBytes: number,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const config = UPLOAD_CONFIG[purpose];
  if (!config) throw AppError.badRequest("Unknown upload purpose", "UNKNOWN_PURPOSE");

  const type = contentType.split(";")[0].trim().toLowerCase();
  if (!config.allowedTypes.includes(type)) {
    throw AppError.badRequest(
      `Content-Type not allowed for ${purpose}`,
      "CONTENT_TYPE_NOT_ALLOWED",
      { allowed: config.allowedTypes }
    );
  }
  if (sizeBytes > config.maxBytes) {
    throw AppError.badRequest(`File too large (max ${config.maxBytes} bytes)`, "FILE_TOO_LARGE");
  }

  const now = new Date();
  const dir = `${purpose}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
  const ext = mimeExt[type] ?? "bin";
  const key = `${dir}/${randomBytes(12).toString("hex")}.${ext}`;
  const expires = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;
  const token = sign(key, purpose, expires);

  await AuditLog.create({
    actorId: a?.id ?? null,
    actorRole: a?.role ?? null,
    action: "upload.presign",
    resource: "upload",
    resourceId: key,
    meta: { purpose, contentType: type, sizeBytes },
    severity: "INFO",
  });

  return {
    key,
    purpose,
    contentType: type,
    sizeBytes,
    expiresInSeconds: EXPIRY_SECONDS,
    url: `/api/v1/uploads/${encodeURIComponent(key)}?token=${token}&expires=${expires}`,
  };
};

export const storeUpload = async (key: string, token: string, expiresAt: string, body: Buffer): Promise<unknown> => {
  const purpose = key.split("/")[0] as UploadPurpose;
  if (!UPLOAD_PURPOSES.includes(purpose)) throw AppError.badRequest("Unknown upload purpose", "UNKNOWN_PURPOSE");
  const expires = Number(expiresAt);
  if (!expires || Date.now() / 1000 > expires) throw AppError.unauthorized("Upload URL expired", "UPLOAD_EXPIRED");
  const expected = sign(key, purpose, expires);
  if (token !== expected) throw AppError.unauthorized("Invalid upload signature", "BAD_SIGNATURE");

  const rel = safeKey(key);
  const full = path.join(UPLOAD_DIR, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);

  return { stored: true, key, bytes: body.length };
};

export const confirmUpload = async (key: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const rel = safeKey(key);
  const full = path.join(UPLOAD_DIR, rel);
  if (!fs.existsSync(full)) throw AppError.notFound("Uploaded object not found", "OBJECT_NOT_FOUND");

  await AuditLog.create({
    actorId: a?.id ?? null,
    actorRole: a?.role ?? null,
    action: "upload.confirm",
    resource: "upload",
    resourceId: key,
    severity: "INFO",
  });

  return { accepted: true, key, sizeBytes: fs.statSync(full).size };
};
