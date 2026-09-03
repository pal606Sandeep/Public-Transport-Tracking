import { API_BASE_URL } from "@/config/env.config";
import { getAccessToken, setAccessToken } from "@/lib/auth/tokenStore";
import { ApiError } from "@/lib/error/apiError";
import type { ApiResponse } from "@/types";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialisable body; Content-Type is set automatically. */
  body?: unknown;
  /** Adds an Idempotency-Key header. Use on create / charge / bulk endpoints. */
  idempotent?: boolean;
  /** Skip automatic 401 -> refresh -> retry (used by the refresh call itself). */
  skipAuthRetry?: boolean;
  /** Explicit bearer override. `undefined` = use the in-memory token; `null` = send none. */
  token?: string | null;
  /**
   * If the device is offline (or the request never reaches the network), stash
   * it in the durable outbox and resolve with `{ queued: true }` instead of
   * throwing. Only for safe-to-retry writes (POST/PATCH). See `lib/offline`.
   */
  queueOffline?: boolean;
  /** Short label shown in the "pending sync" UI, e.g. "Complaint". */
  queueLabel?: string;
}

/** Resolved value when a write was parked in the offline outbox. */
export class QueuedResponse {
  readonly queued = true as const;
  constructor(public readonly label: string) {}
}

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

let refreshPromise: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
    const token = json.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    return null;
  }
}

/** Single-flight: concurrent 401s share one refresh round-trip. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, {
      message: `Invalid server response (${res.status})`,
    });
  }

  if (!res.ok) {
    const err = (json as { error?: Record<string, unknown> }).error ?? {};
    throw new ApiError(res.status, {
      message: (err.message as string) || `Request failed (${res.status})`,
      code: err.code as string,
      details: err.details as Record<string, unknown>,
      traceId: err.traceId as string,
    });
  }

  const body = json as ApiResponse<T>;
  if (body && body.success === false) {
    throw new ApiError(res.status, { message: body.message || "Request failed" });
  }
  return body;
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    body,
    idempotent,
    skipAuthRetry,
    token,
    headers,
    queueOffline,
    queueLabel,
    ...rest
  } = options;

  const url = `${API_BASE_URL}${path}`;

  const parkOffline = async (): Promise<ApiResponse<T>> => {
    const { enqueue } = await import("@/lib/offline/outbox");
    await enqueue({
      url,
      method: (rest.method as string) ?? "POST",
      headers: headers as Record<string, string> | undefined,
      body,
      label: queueLabel ?? "Change",
    });
    return new QueuedResponse(
      queueLabel ?? "Change"
    ) as unknown as ApiResponse<T>;
  };

  // Fast path: already known to be offline — don't even try the socket.
  if (
    queueOffline &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return parkOffline();
  }

  const doFetch = (bearer: string | null): Promise<Response> =>
    fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(idempotent ? { "Idempotency-Key": uuid() } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const bearer = token !== undefined ? token : getAccessToken();
  let res: Response;
  try {
    res = await doFetch(bearer);
  } catch (networkError) {
    // The request never left the device (offline, DNS, CORS-preflight failure).
    if (queueOffline) return parkOffline();
    throw networkError;
  }

  if (res.status === 401 && !skipAuthRetry && token === undefined) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await doFetch(fresh);
  }

  return parse<T>(res);
}

export const api = {
  get: <T>(p: string, o?: RequestOptions) => apiClient<T>(p, { ...o, method: "GET" }),
  post: <T>(p: string, body?: unknown, o?: RequestOptions) =>
    apiClient<T>(p, { ...o, method: "POST", body }),
  patch: <T>(p: string, body?: unknown, o?: RequestOptions) =>
    apiClient<T>(p, { ...o, method: "PATCH", body }),
  put: <T>(p: string, body?: unknown, o?: RequestOptions) =>
    apiClient<T>(p, { ...o, method: "PUT", body }),
  del: <T>(p: string, o?: RequestOptions) => apiClient<T>(p, { ...o, method: "DELETE" }),
};
