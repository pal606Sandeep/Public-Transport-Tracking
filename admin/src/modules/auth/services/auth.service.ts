import { api } from "@/utils/apiClient";
import { setAccessToken, getAccessToken } from "@/lib/auth/tokenStore";
import { ApiError } from "@/lib/error/apiError";
import { isAdminRole } from "@/constants/roles";
import type { AuthUser } from "@/types";

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

const normalizeUser = (u: AuthUser): AuthUser => ({
  ...u,
  id: u.id ?? u._id ?? "",
});

/** Reject non-staff accounts — this dashboard is not for passengers/drivers. */
export function assertAdminRole(user: AuthUser): void {
  if (!isAdminRole(user.role)) {
    throw new ApiError(403, {
      code: "WRONG_APP",
      message:
        "This account doesn't have dashboard access. Use the passenger or driver app instead.",
    });
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await api.post<LoginResponse>("/auth/login", input, {
    skipAuthRetry: true,
  });
  const data = res.data as LoginResponse;
  const user = normalizeUser(data.user);
  assertAdminRole(user);
  setAccessToken(data.accessToken);
  return user;
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<{ user: AuthUser }>("/auth/me");
  return normalizeUser((res.data as { user: AuthUser }).user);
}

/**
 * Re-establish a session from the refresh cookie on load. Returns the user, or
 * null when there is no valid cookie / the account isn't a staff account.
 */
export async function bootstrapSession(): Promise<AuthUser | null> {
  try {
    const res = await api.post<{ accessToken: string }>(
      "/auth/refresh",
      undefined,
      { skipAuthRetry: true }
    );
    const token = (res.data as { accessToken?: string })?.accessToken ?? null;
    if (!token) return null;
    setAccessToken(token);
    const user = await fetchMe();
    if (!isAdminRole(user.role)) {
      setAccessToken(null);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    if (getAccessToken()) await api.post("/auth/logout");
  } catch {
    /* best effort */
  }
  setAccessToken(null);
}
