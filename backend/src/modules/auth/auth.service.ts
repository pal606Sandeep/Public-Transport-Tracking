import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Types } from "mongoose";
import { User } from "../user/user.model.js";
import { AuthSession } from "../../models/authSession.model.js";
import { Device } from "../../models/device.model.js";
import { OtpRequest } from "../../models/otpRequest.model.js";
import { PasswordResetToken } from "../../models/passwordResetToken.model.js";
import { AppError } from "../../utils/AppError.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenLifetimeMs,
  signGuestToken,
  AccessTokenPayload,
} from "../../utils/tokens.js";

const hash = (v: string): string => bcrypt.hashSync(v, 10);
const compare = (v: string, h: string): boolean => bcrypt.compareSync(v, h);
const sha256 = (v: string): string =>
  crypto.createHash("sha256").update(v).digest("hex");

/* ------------------------------------------------------------------ */
/* P1-07 Registration & login                                          */
/* ------------------------------------------------------------------ */

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}): Promise<{ user: unknown }> => {
  const email = input.email.toLowerCase();
  const exists = await User.findOne({ email, deletedAt: null });
  if (exists) {
    throw AppError.conflict("Email already registered", "EMAIL_IN_USE");
  }

  const role = input.role || "PASSENGER";
  const user = await User.create({
    name: input.name,
    email,
    phone: input.phone ?? null,
    password: hash(input.password),
    role,
    isActive: true,
  });
  return { user: (user as any).toPublicJSON?.() ?? user };
};

/* --------------------- token/session helpers ------------------------ */

export interface IssuedTokens {
  access: string;
  refresh: string;
  user: unknown;
}

const createSession = async (input: {
  userId: string;
  familyId?: string;
  userAgent?: string;
  ip?: string;
  deviceId?: string | null;
}): Promise<{ refresh: string; sessionId: string }> => {
  const refresh = generateRefreshToken();
  const familyId = input.familyId || crypto.randomBytes(24).toString("hex");
  const doc = await AuthSession.create({
    userId: new Types.ObjectId(input.userId),
    refreshTokenHash: sha256(refresh),
    userAgent: input.userAgent || "",
    ip: input.ip || "",
    deviceId: input.deviceId ?? null,
    familyId,
    expiresAt: new Date(Date.now() + refreshTokenLifetimeMs()),
  });
  return { refresh, sessionId: doc._id.toString() };
};

const issueTokens = async (input: {
  userId: string;
  role: string;
  familyId?: string;
  userAgent?: string;
  ip?: string;
  deviceId?: string | null;
}): Promise<IssuedTokens> => {
  const { refresh, sessionId } = await createSession(input);
  const payload: AccessTokenPayload = {
    id: input.userId,
    role: input.role,
    sessionId,
    scope: "user",
  };
  const { token: access } = signAccessToken(payload);
  return { access, refresh, user: null };
};

const loadSafeUser = async (userId: string): Promise<unknown> => {
  const user = await User.findById(userId).lean();
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  const { password: _password, ...safe } = user;
  return safe;
};

export const loginUser = async (input: {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
  deviceId?: string;
}): Promise<IssuedTokens & { user: unknown }> => {
  const user = await User.findByEmail(input.email);
  if (!user || !user.password || !compare(input.password, user.password)) {
    throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (!user.isActive || user.deletedAt) {
    throw AppError.unauthorized("Account is inactive", "ACCOUNT_INACTIVE");
  }

  const issued = await issueTokens({
    userId: user._id.toString(),
    role: user.role,
    userAgent: input.userAgent,
    ip: input.ip,
    deviceId: input.deviceId,
  });
  return { ...issued, user: await loadSafeUser(user._id.toString()) };
};

/* --------------------- P1-08 Refresh (rotation + reuse detection) ---- */

export const refreshAccessToken = async (input: {
  refreshToken?: string;
  userAgent?: string;
  ip?: string;
}): Promise<IssuedTokens> => {
  const refresh = input.refreshToken;
  if (!refresh) throw AppError.unauthorized("Refresh token required", "NO_REFRESH");
  const tokenHash = sha256(refresh);
  const session = await AuthSession.findOne({ refreshTokenHash: tokenHash });

  if (!session) {
    throw AppError.unauthorized("Invalid refresh token", "INVALID_REFRESH");
  }

  // Reuse detection: a token already rotated out (reason ROTATED) being
  // presented again is a token-theft indicator -> revoke the whole family.
  if (session.revokedAt) {
    if (session.revokeReason === "ROTATED") {
      await AuthSession.updateMany(
        { familyId: session.familyId },
        { revokedAt: new Date(), revokeReason: "REUSE" }
      );
      throw AppError.unauthorized("Refresh token reuse detected", "REUSE_DETECTED");
    }
    // Logged out / individually revoked — just this token is dead.
    throw AppError.unauthorized("Refresh token has been revoked", "INVALID_REFRESH");
  }

  if (session.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token expired", "REFRESH_EXPIRED");
  }

  const user = await User.findById(session.userId).lean();
  if (!user || !user.isActive || user.deletedAt) {
    throw AppError.unauthorized("Account inactive", "ACCOUNT_INACTIVE");
  }

  // Rotate: revoke current, create new session in same family.
  await AuthSession.updateOne(
    { _id: session._id },
    { revokedAt: new Date(), revokeReason: "ROTATED" }
  );
  const { refresh: newRefresh, sessionId: newSessionId } = await createSession({
    userId: session.userId.toString(),
    familyId: session.familyId ?? undefined,
    userAgent: input.userAgent,
    ip: input.ip,
    deviceId: session.deviceId,
  });

  const payload: AccessTokenPayload = {
    id: session.userId.toString(),
    role: user.role,
    sessionId: newSessionId,
    scope: "user",
  };
  const { token: access } = signAccessToken(payload);
  return { access, refresh: newRefresh, user: await loadSafeUser(session.userId.toString()) };
};

/* --------------------- P1-10 Logout & sessions ----------------------- */

export const revokeSessionByRefreshToken = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) return;
  const tokenHash = sha256(refreshToken);
  await AuthSession.updateOne(
    { refreshTokenHash: tokenHash },
    { revokedAt: new Date(), revokeReason: "LOGOUT" }
  );
};

export const revokeRefreshToken = async (refreshToken?: string): Promise<void> => {
  await revokeSessionByRefreshToken(refreshToken);
};

export const listSessions = async (userId: string): Promise<unknown[]> => {
  const docs = await AuthSession.find({ userId, revokedAt: null })
    .sort({ lastUsedAt: -1 })
    .lean();
  return docs.map((d) => ({
    sessionId: d._id.toString(),
    deviceId: d.deviceId,
    userAgent: d.userAgent,
    ip: d.ip,
    createdAt: d.createdAt,
    lastUsedAt: d.lastUsedAt,
    expiresAt: d.expiresAt,
  }));
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  const res = await AuthSession.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { revokedAt: new Date(), revokeReason: "REVOKE" }
  );
  if (res.matchedCount === 0) throw AppError.notFound("Session not found", "SESSION_NOT_FOUND");
};

export const revokeAllSessionsWithToken = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) return;
  const session = await AuthSession.findOne({ refreshTokenHash: sha256(refreshToken) });
  if (session?.familyId) {
    await AuthSession.updateMany(
      { familyId: session.familyId },
      { revokedAt: new Date(), revokeReason: "LOGOUT" }
    );
  }
};

export const revokeAllSessions = async (userId: string): Promise<void> => {
  await AuthSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date(), revokeReason: "REVOKE" }
  );
};

/* --------------------- P1-09 Mobile OTP ----------------------------- */

export interface OtpPolicy {
  maxAttempts: number;
  attemptWindowSeconds: number;
  lockoutSeconds: number;
  resendCooldownSeconds: number;
  ttlSeconds: number;
  perNumberWindowSeconds: number;
  perNumberLimit: number;
  perIpWindowSeconds: number;
  perIpLimit: number;
}

/* istanbul ignore next */
export const defaultOtpPolicy = (): OtpPolicy => ({
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  attemptWindowSeconds: Number(process.env.OTP_ATTEMPT_WINDOW) || 10 * 60,
  lockoutSeconds: Number(process.env.OTP_LOCKOUT) || 15 * 60,
  resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN) || 60,
  ttlSeconds: Number(process.env.OTP_TTL) || 10 * 60,
  perNumberWindowSeconds: Number(process.env.OTP_NUMBER_WINDOW) || 60 * 60,
  perNumberLimit: Number(process.env.OTP_NUMBER_LIMIT) || 5,
  perIpWindowSeconds: Number(process.env.OTP_IP_WINDOW) || 60 * 60,
  perIpLimit: Number(process.env.OTP_IP_LIMIT) || 20,
});

// In-memory IP bucket keyed by ipHash with rolling window (Redis would back this
// in a distributed deployment; single-node ops may also use the Mongo counter).
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

const ipAllowed = (ipHash: string, policy: OtpPolicy): boolean => {
  const now = Date.now();
  const b = ipBuckets.get(ipHash);
  if (!b || b.resetAt < now) {
    ipBuckets.set(ipHash, { count: 1, resetAt: now + policy.perIpWindowSeconds * 1000 });
    return true;
  }
  b.count += 1;
  return b.count <= policy.perIpLimit;
};

export const requestOtp = async (input: {
  phone: string;
  ip: string;
}): Promise<{ message: string; cooldownRemaining?: number }> => {
  const policy = defaultOtpPolicy();
  const phone = input.phone;
  const ipHash = sha256(input.ip);
  const now = Date.now();

  // Per-number windowed limit.
  const numberCount = await OtpRequest.countDocuments({
    phone,
    createdAt: { $gte: new Date(now - policy.perNumberWindowSeconds * 1000) },
  });
  if (numberCount >= policy.perNumberLimit) {
    throw AppError.tooManyRequests("OTP limit reached for this number", "OTP_NUMBER_LIMIT");
  }
  // Per-IP limit.
  if (!ipAllowed(ipHash, policy)) {
    throw AppError.tooManyRequests("OTP limit reached for this device", "OTP_IP_LIMIT");
  }

  const latest = await OtpRequest.findOne({ phone }).sort({ createdAt: -1 });
  if (latest && !latest.verifiedAt) {
    const cooldownEnd =
      (latest.lastSentAt?.getTime() || 0) + policy.resendCooldownSeconds * 1000;
    if (now < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - now) / 1000);
      throw AppError.tooManyRequests(
        `Please wait ${remaining}s before requesting another OTP`,
        "OTP_COOLDOWN",
        { remainingSeconds: remaining }
      );
    }
    if (latest.lockedUntil && latest.lockedUntil.getTime() > now) {
      throw AppError.tooManyRequests(
        "Too many attempts. Try again later",
        "OTP_LOCKED",
        { remainingSeconds: Math.ceil((latest.lockedUntil.getTime() - now) / 1000) }
      );
    }
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await OtpRequest.create({
    phone,
    ipHash,
    otpHash: hash(otp),
    purpose: "login",
    expiresAt: new Date(now + policy.ttlSeconds * 1000),
    attempts: 0,
    lastSentAt: new Date(now),
  });

  // In a real deployment this would SMS the OTP. Log for dev/smoke.
  // eslint-disable-next-line no-console
  console.log(`[DEV-OTP] ${phone} -> ${otp}`);

  return { message: "OTP sent" };
};

export const verifyOtp = async (input: {
  phone: string;
  otp: string;
  userAgent?: string;
  ip?: string;
}): Promise<IssuedTokens> => {
  const policy = defaultOtpPolicy();
  const latest = await OtpRequest.findOne({ phone: input.phone, purpose: "login" }).sort({ createdAt: -1 });

  if (!latest || !latest.otpHash) {
    throw AppError.badRequest("No OTP found. Request one first", "NO_OTP");
  }
  if (latest.verifiedAt) {
    throw AppError.badRequest("OTP already used", "OTP_USED");
  }
  if (latest.lockedUntil && latest.lockedUntil.getTime() > Date.now()) {
    throw AppError.tooManyRequests("Too many failed attempts. Try again later", "OTP_LOCKED");
  }
  if (!latest.expiresAt || latest.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("OTP expired. Request a new one", "OTP_EXPIRED");
  }

  if (!compare(input.otp, latest.otpHash)) {
    latest.attempts = (latest.attempts || 0) + 1;
    if (latest.attempts >= policy.maxAttempts) {
      latest.lockedUntil = new Date(Date.now() + policy.lockoutSeconds * 1000);
      await latest.save();
      throw AppError.tooManyRequests("Too many failed attempts. Account locked", "OTP_LOCKED");
    }
    await latest.save();
    throw AppError.badRequest("Invalid OTP", "OTP_INVALID");
  }

  latest.verifiedAt = new Date();
  await latest.save();

  // Find-or-create a user by phone (PASSENGER default).
  let user = await User.findOne({ phone: input.phone });
  if (!user) {
    user = await User.create({
      name: `User ${input.phone.slice(-4)}`,
      phone: input.phone,
      email: `phone_${sha256(input.phone).slice(0, 16)}@otelocal.in`,
      password: hash(crypto.randomBytes(24).toString("hex")),
      role: "PASSENGER",
      isActive: true,
    });
  }
  const issued = await issueTokens({
    userId: user._id.toString(),
    role: user.role,
    userAgent: input.userAgent,
    ip: input.ip,
  });
  return { ...issued, user: await loadSafeUser(user._id.toString()) };
};

/* --------------------- P1-11 Password ------------------------------- */

export const forgotPassword = async (input: { email: string }): Promise<{ message: string }> => {
  const email = input.email.toLowerCase();
  const user = await User.findByEmail(email);
  // Always respond the same regardless of whether the account exists.
  if (!user) return { message: "If that email exists, a reset link has been sent" };

  const token = generateRefreshToken();
  await PasswordResetToken.create({
    email,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  // eslint-disable-next-line no-console
  console.log(`[DEV-RESET] ${email} -> ${token}`);
  return { message: "If that email exists, a reset link has been sent" };
};

export const resetPassword = async (input: {
  token: string;
  newPassword: string;
}): Promise<{ message: string; refresh?: string }> => {
  const tokenHash = sha256(input.token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.consumedAt) {
    throw AppError.badRequest("Invalid or already-used token", "RESET_TOKEN_INVALID");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("Reset token expired", "RESET_TOKEN_EXPIRED");
  }

  const user = await User.findByEmail(record.email);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  user.password = hash(input.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  record.consumedAt = new Date();
  await record.save();

  await revokeAllSessions(user._id.toString());

  // Issue a fresh session so the user is logged in immediately after reset.
  const issued = await issueTokens({
    userId: user._id.toString(),
    role: user.role,
  });
  return { message: "Password reset successful", refresh: issued.refresh };
};

export const changePassword = async (input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const user = await User.findById(input.userId);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");
  if (!user.password || !compare(input.currentPassword, user.password)) {
    throw AppError.unauthorized("Current password is incorrect", "WRONG_PASSWORD");
  }
  if (compare(input.newPassword, user.password)) {
    throw AppError.badRequest("New password must differ from current", "PASSWORD_SAME");
  }
  user.password = hash(input.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllSessions(input.userId);
  return { message: "Password changed" };
};

/* --------------------- P1-12 Guest ---------------------------------- */

export const createGuestSession = async (input?: { userAgent?: string; ip?: string }): Promise<{ token: string; scope: "guest" }> => {
  const token = signGuestToken({ id: crypto.randomBytes(16).toString("hex"), scope: "guest" });
  return { token, scope: "guest" };
};

/* --------------------- P1-13 Profile -------------------------------- */

export const getProfile = async (userId: string): Promise<unknown> => loadSafeUser(userId);

export const updateProfile = async (
  userId: string,
  input: { name?: string; phone?: string | null; avatarKey?: string | null; language?: string }
): Promise<unknown> => {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.avatarKey !== undefined) user.avatarKey = input.avatarKey;
  if (input.language !== undefined) user.language = input.language;

  await user.save();
  return loadSafeUser(userId);
};

/* --------------------- P1-16 Devices -------------------------------- */

export const registerDevice = async (input: {
  userId: string;
  role: string;
  deviceId: string;
  name?: string;
  platform?: string;
  pushSubscription?: unknown;
}): Promise<{ device: unknown; status: string }> => {
  const existing = await Device.findOne({ userId: input.userId, deviceId: input.deviceId });
  if (existing) {
    if (input.pushSubscription) existing.pushSubscription = input.pushSubscription;
    if (input.name) existing.name = input.name;
    existing.lastSeenAt = new Date();
    await existing.save();
    return { device: existing.toObject(), status: existing.status };
  }

  // DRIVER/CONDUCTOR may only have one ACTIVE device; a second goes PENDING.
  const requiresApproval = ["DRIVER", "CONDUCTOR"].includes(input.role);
  let status: "ACTIVE" | "PENDING" | "REVOKED" = "ACTIVE";
  if (requiresApproval) {
    const active = await Device.countDocuments({
      userId: input.userId,
      status: { $in: ["ACTIVE", "PENDING"] },
    });
    if (active > 0) status = "PENDING";
  }

  const doc = await Device.create({
    userId: input.userId,
    deviceId: input.deviceId,
    name: input.name || "Unknown device",
    platform: input.platform || "web",
    status,
    pushSubscription: input.pushSubscription ?? null,
  });
  return { device: doc.toObject(), status };
};

export const listDevices = async (userId: string): Promise<unknown[]> => {
  const docs = await Device.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map((d) => ({ ...d, _id: d._id.toString() }));
};

export const deleteDevice = async (userId: string, deviceId: string): Promise<void> => {
  const res = await Device.deleteOne({ userId, deviceId });
  if (res.deletedCount === 0) throw AppError.notFound("Device not found", "DEVICE_NOT_FOUND");
};

/* --------------------- systematic role lookup helper ---------------- */

export const findUserById = async (id: string) => User.findById(id);
