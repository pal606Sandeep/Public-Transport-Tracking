import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { AUTH_ROUTES } from "./auth.routes";
import type {
  AuthResult,
  AuthTokens,
  LoginInput,
  RegisterInput,
} from "./auth.types";

export const register = (
  payload: RegisterInput
): Promise<ApiResponse<AuthResult>> =>
  apiClient<AuthResult>(AUTH_ROUTES.register(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const login = (
  payload: LoginInput
): Promise<ApiResponse<AuthResult>> =>
  apiClient<AuthResult>(AUTH_ROUTES.login(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const refreshToken = (
  token: string
): Promise<ApiResponse<AuthTokens>> =>
  apiClient<AuthTokens>(AUTH_ROUTES.refreshToken(), {
    method: "POST",
    body: JSON.stringify({ refreshToken: token }),
  });
