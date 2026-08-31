import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = (): string =>
  process.env.JWT_SECRET || "replace_with_a_strong_secret";
const ACCESS_TTL = process.env.JWT_EXPIRES_IN || "15m";
const GUEST_TTL = process.env.GUEST_EXPIRES_IN || "1d";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_EXPIRES_DAYS) || 30;

export interface AccessTokenPayload {
  id: string;
  role: string;
  sessionId?: string;
  scope?: string;
  iat?: number;
}

export const signAccessToken = (
  payload: AccessTokenPayload
): { token: string; expiresIn: string } => {
  const token = jwt.sign(payload, JWT_SECRET(), {
    expiresIn: (ACCESS_TTL as jwt.SignOptions["expiresIn"]) || "15m",
  } as jwt.SignOptions);
  return { token, expiresIn: ACCESS_TTL };
};

export const signGuestToken = (payload: { id: string; scope: "guest" }): string =>
  jwt.sign(payload, JWT_SECRET(), {
    expiresIn: GUEST_TTL as jwt.SignOptions["expiresIn"],
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, JWT_SECRET()) as AccessTokenPayload;
};

/** Opaque refresh token: random 48-byte URL-safe string. */
export const generateRefreshToken = (): string =>
  crypto.randomBytes(48).toString("base64url");

/** Hash a token/OTP for storage (never store raw). */
export const hashToken = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

export const refreshTokenLifetimeMs = (): number =>
  REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
