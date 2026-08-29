import * as authApi from "./auth.api";
import type {
  AuthResult,
  AuthTokens,
  LoginInput,
  RegisterInput,
} from "./auth.types";

export const registerUser = async (
  payload: RegisterInput
): Promise<AuthResult | null> => {
  const res = await authApi.register(payload);
  return res.data ?? null;
};

export const loginUser = async (
  payload: LoginInput
): Promise<AuthResult | null> => {
  const res = await authApi.login(payload);
  return res.data ?? null;
};

export const refreshAccessToken = async (
  token: string
): Promise<AuthTokens | null> => {
  const res = await authApi.refreshToken(token);
  return res.data ?? null;
};
