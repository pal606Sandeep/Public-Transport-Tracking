import { api } from "@/utils/apiClient";
import { API_BASE_URL } from "@/config/env.config";
import { getAccessToken } from "@/lib/auth/tokenStore";

export type UploadPurpose =
  | "complaint"
  | "incident"
  | "lost_found"
  | "profile"
  | "vehicle_document";

/** Backend origin without the /api/v1 suffix (presign `url` is already /api/v1/…). */
const ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

interface PresignResult {
  key: string;
  url: string; // relative: /api/v1/uploads/<key>?token=&expires=
}

/**
 * presign → raw PUT the bytes → return the object key to attach to a record.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose
): Promise<string> {
  const res = await api.post<PresignResult>("/uploads/presign", {
    purpose,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  const { key, url } = res.data as PresignResult;

  const put = await fetch(`${ORIGIN}${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);

  return key;
}

export const uploadMany = (
  files: File[],
  purpose: UploadPurpose
): Promise<string[]> => Promise.all(files.map((f) => uploadFile(f, purpose)));
