"use client";

import { useState } from "react";
import * as authService from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.types";

export const useAuth = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (payload: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.loginUser(payload);
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.registerUser(payload);
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { login, register, loading, error };
};
