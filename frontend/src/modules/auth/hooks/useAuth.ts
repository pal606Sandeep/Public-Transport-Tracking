"use client";

import { useMutation } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sessionEstablished,
  sessionCleared,
  sessionUserPatched,
} from "@/store/slices/session.slice";
import * as authService from "../services/auth.service";

/** Current session view (status + user + derived booleans). */
export const useSession = () => {
  const { status, user } = useAppSelector((s) => s.session);
  return {
    status,
    user,
    isLoading: status === "idle" || status === "loading",
    isAuthenticated: status === "authenticated",
    isGuest: status === "guest",
    role: user?.role,
  };
};

export const useLogin = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => dispatch(sessionEstablished({ user })),
  });
};

export const useRegister = () =>
  useMutation({ mutationFn: authService.register });

export const useRequestOtp = () =>
  useMutation({ mutationFn: (phone: string) => authService.requestOtp(phone) });

export const useVerifyOtp = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authService.verifyOtp,
    onSuccess: (user) => dispatch(sessionEstablished({ user })),
  });
};

export const useGuest = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authService.startGuest,
    onSuccess: (user) => dispatch(sessionEstablished({ user })),
  });
};

export const useLogout = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => dispatch(sessionCleared()),
  });
};

export const useForgotPassword = () =>
  useMutation({ mutationFn: (email: string) => authService.forgotPassword(email) });

export const useResetPassword = () =>
  useMutation({
    mutationFn: (v: { token: string; newPassword: string }) =>
      authService.resetPassword(v.token, v.newPassword),
  });

export const useUpdateProfile = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authService.updateMe,
    onSuccess: (user) => dispatch(sessionUserPatched(user)),
  });
};
