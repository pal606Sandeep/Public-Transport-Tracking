import { API_BASE_URL } from "../config/env.config";
import type { ApiResponse } from "../types";

export interface RequestOptions extends RequestInit {
  token?: string;
}

export const apiClient = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...rest,
  });

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Invalid response from server (${res.status})`);
  }

  if (!res.ok || !json.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json;
};
