import { api } from "@/utils/apiClient";
import { setAccessToken } from "@/lib/auth/tokenStore";
import { ApiError } from "@/lib/error/apiError";
import { roleArea } from "@/constants/roles";
import type { ApiResponse, AuthUser } from "@/types";
import { AUTH_ENDPOINTS as E } from "../constant/auth.constants";

type AuthPayload = { user: AuthUser; accessToken: string };

/** Store the access token and return the user from an auth response. */
const adopt = (res: ApiResponse<AuthPayload>): AuthUser => {
  const data = res.data;
  if (!data?.accessToken || !data.user) {
    throw new Error("Malformed auth response");
  }
  setAccessToken(data.accessToken);
  return data.user;
};

/**
 * This PWA serves passengers, drivers and conductors only. An admin / manager /
 * dispatcher account belongs to the separate admin dashboard — reject it here
 * (dropping the token + refresh cookie) with a clear message.
 */
const assertServedRole = (user: AuthUser): AuthUser => {
  if (roleArea(user.role) === "unknown") {
    setAccessToken(null);
    void api.post(E.logout).catch(() => {});
    throw new ApiError(403, {
      code: "WRONG_APP",
      message:
        "This account is for the admin dashboard. Open the admin app to sign in.",
    });
  }
  return user;
};

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}
export interface OtpVerifyInput {
  phone: string;
  otp: string;
}

export const login = async (input: LoginInput): Promise<AuthUser> =>
  assertServedRole(adopt(await api.post<AuthPayload>(E.login, input)));

export const register = async (
  input: RegisterInput
): Promise<{ user: AuthUser }> => {
  const res = await api.post<{ user: AuthUser }>(E.register, input);
  return res.data as { user: AuthUser };
};

export const requestOtp = (phone: string) =>
  api.post<{ sent?: boolean }>(E.otpRequest, { phone });

export const verifyOtp = async (input: OtpVerifyInput): Promise<AuthUser> =>
  assertServedRole(adopt(await api.post<AuthPayload>(E.otpVerify, input)));

type GuestPayload = {
  user?: AuthUser;
  accessToken?: string;
  token?: string;
};

const readGuestToken = (data?: GuestPayload): string | null =>
  data?.accessToken ?? data?.token ?? null;

/**
 * Mint a guest token and store it, without touching session UI state.
 * Used at bootstrap so token-guarded public endpoints (`/config`, `/routes`,
 * `/stops`) work before the visitor has chosen to sign in or browse.
 */
export const ensureGuestToken = async (): Promise<void> => {
  const res = await api.post<GuestPayload>(E.guest);
  setAccessToken(readGuestToken(res.data));
};

/** Explicitly enter guest mode (from the "Continue as guest" action). */
export const startGuest = async (): Promise<AuthUser> => {
  // TODO(verify): backend auth.service.createGuestSession() return shape.
  const res = await api.post<GuestPayload>(E.guest);
  setAccessToken(readGuestToken(res.data));
  return (
    (res.data?.user as AuthUser) ??
    ({ _id: "guest", name: "Guest", email: "", role: "GUEST" } as AuthUser)
  );
};

/** Restore a session from the httpOnly refresh cookie. Returns null if none. */
export const bootstrapSession = async (): Promise<AuthUser | null> => {
  try {
    const res = await api.post<AuthPayload>(E.refresh, undefined, {
      skipAuthRetry: true,
    });
    const user = adopt(res);
    // admin-app account with a live cookie — not a session this app can use
    if (roleArea(user.role) === "unknown") {
      setAccessToken(null);
      return null;
    }
    return user;
  } catch {
    setAccessToken(null);
    return null;
  }
};

export const fetchMe = async (): Promise<AuthUser> => {
  const res = await api.get<{ user: AuthUser }>(E.me);
  return (res.data as { user: AuthUser }).user;
};

export const updateMe = async (
  patch: Partial<Pick<AuthUser, "name" | "phone" | "language" | "avatarKey">>
): Promise<AuthUser> => {
  const res = await api.patch<{ user: AuthUser }>(E.me, patch);
  return (res.data as { user: AuthUser }).user;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post(E.logout);
  } finally {
    setAccessToken(null);
  }
};

export const forgotPassword = (email: string) =>
  api.post(E.forgot, { email });

export const resetPassword = (token: string, newPassword: string) =>
  api.post(E.reset, { token, newPassword });

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post(E.change, { currentPassword, newPassword });
