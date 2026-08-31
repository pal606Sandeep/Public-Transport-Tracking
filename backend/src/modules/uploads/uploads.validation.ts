import { z } from "zod";

export type UploadPurpose = "complaint" | "incident" | "lost_found" | "profile" | "vehicle_document";

export const UPLOAD_PURPOSES: UploadPurpose[] = [
  "complaint",
  "incident",
  "lost_found",
  "profile",
  "vehicle_document",
];

interface PurposeConfig {
  maxBytes: number;
  allowedTypes: string[];
}

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC = [...IMG, "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const UPLOAD_CONFIG: Record<UploadPurpose, PurposeConfig> = {
  complaint: { maxBytes: 10 * 1024 * 1024, allowedTypes: DOC },
  incident: { maxBytes: 10 * 1024 * 1024, allowedTypes: DOC },
  lost_found: { maxBytes: 10 * 1024 * 1024, allowedTypes: DOC },
  profile: { maxBytes: 5 * 1024 * 1024, allowedTypes: IMG },
  vehicle_document: { maxBytes: 15 * 1024 * 1024, allowedTypes: DOC },
};

export const presignSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    contentType: z.string().min(1).max(120),
    sizeBytes: z.number().int().positive(),
  })
  .strict();

export const confirmSchema = z
  .object({
    key: z.string().min(1).max(500),
  })
  .strict();
