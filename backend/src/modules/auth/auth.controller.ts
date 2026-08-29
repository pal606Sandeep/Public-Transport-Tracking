import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import * as auth from "./auth.service.js";
import type {
  RegisterInput,
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  RegisterDeviceInput,
} from "./auth.validation.js";

const REFRESH_COOKIE = "refresh_token";

const clientMeta = (req: Request) => ({
  userAgent: req.get("user-agent") || "",
  ip: req.ip || req.socket?.remoteAddress || "",
  deviceId: (req.body?.deviceId as string) || undefined,
});

export function setRefreshCookie(res: Response, refresh: string): void {
  res.cookie(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: Number(process.env.REFRESH_EXPIRES_DAYS || 30) * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
}

/* ----------------- P1-07 register / login ---------------------------- */

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RegisterInput;
    const { user } = await auth.registerUser(body);
    apiResponse(res, 201, true, "User registered", { user });
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginInput;
    const meta = clientMeta(req);
    const result = await auth.loginUser({ email: body.email, password: body.password, ...meta });
    setRefreshCookie(res, result.refresh);
    apiResponse(res, 200, true, "Login successful", {
      user: result.user,
      accessToken: result.access,
    });
  }
);

/* ----------------- P1-08 refresh ------------------------------------- */

export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cookie = (req.cookies as Record<string, string>)?.refresh_token;
    const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const meta = clientMeta(req);
    const result = await auth.refreshAccessToken({
      refreshToken: cookie || bearer || (req.body?.refreshToken as string) || undefined,
      ...meta,
    });
    setRefreshCookie(res, result.refresh);
    apiResponse(res, 200, true, "Token refreshed", {
      user: result.user,
      accessToken: result.access,
    });
  }
);

/* ----------------- P1-10 logout / sessions --------------------------- */

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cookie = (req.cookies as Record<string, string>)?.refresh_token;
    const refresh = cookie || (req.body?.refreshToken as string) || undefined;
    await auth.revokeRefreshToken(refresh);
    clearRefreshCookie(res);
    apiResponse(res, 200, true, "Logged out");
  }
);

export const listSessions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const sessions = await auth.listSessions(req.user.id);
    apiResponse(res, 200, true, "Sessions fetched", { sessions });
  }
);

export const revokeSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const sessionId = (req.params as { sessionId: string }).sessionId;
    await auth.revokeSession(req.user.id, sessionId);
    apiResponse(res, 200, true, "Session revoked");
  }
);

/* ----------------- P1-09 OTP ---------------------------------------- */

export const requestOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as OtpRequestInput;
    const meta = clientMeta(req);
    const result = await auth.requestOtp({ phone: body.phone, ip: meta.ip });
    apiResponse(res, 200, true, "OTP sent", result);
  }
);

export const verifyOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as OtpVerifyInput;
    const meta = clientMeta(req);
    const result = await auth.verifyOtp({ phone: body.phone, otp: body.otp, ...meta });
    setRefreshCookie(res, result.refresh);
    apiResponse(res, 200, true, "Login successful", {
      user: result.user,
      accessToken: result.access,
    });
  }
);

/* ----------------- P1-11 password ----------------------------------- */

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ForgotPasswordInput;
    const result = await auth.forgotPassword({ email: body.email });
    apiResponse(res, 200, true, result.message);
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResetPasswordInput;
    const result = await auth.resetPassword({ token: body.token, newPassword: body.newPassword });
    if (result.refresh) setRefreshCookie(res, result.refresh);
    apiResponse(res, 200, true, result.message);
  }
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const body = req.body as ChangePasswordInput;
    const result = await auth.changePassword({
      userId: req.user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    apiResponse(res, 200, true, result.message);
  }
);

/* ----------------- P1-12 guest --------------------------------------- */

export const guestSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const meta = clientMeta(req);
    const result = await auth.createGuestSession(meta);
    apiResponse(res, 200, true, "Guest session created", result);
  }
);

/* ----------------- P1-13 profile ------------------------------------- */

export const me = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const profile = await auth.getProfile(req.user.id);
    apiResponse(res, 200, true, "Profile fetched", { user: profile });
  }
);

export const updateMe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const body = req.body as UpdateProfileInput;
    const profile = await auth.updateProfile(req.user.id, body);
    apiResponse(res, 200, true, "Profile updated", { user: profile });
  }
);

/* ----------------- P1-16 devices ------------------------------------- */

export const registerDevice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const body = req.body as RegisterDeviceInput;
    const result = await auth.registerDevice({
      userId: req.user.id,
      role: req.user.role,
      deviceId: body.deviceId,
      name: body.name,
      platform: body.platform,
      pushSubscription: body.pushSubscription ?? undefined,
    });
    apiResponse(res, 201, true, "Device registered", result);
  }
);

export const listDevices = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const devices = await auth.listDevices(req.user.id);
    apiResponse(res, 200, true, "Devices fetched", { devices });
  }
);

export const deleteDevice = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
    const deviceId = (req.params as { deviceId: string }).deviceId;
    await auth.deleteDevice(req.user.id, deviceId);
    apiResponse(res, 200, true, "Device removed");
  }
);

