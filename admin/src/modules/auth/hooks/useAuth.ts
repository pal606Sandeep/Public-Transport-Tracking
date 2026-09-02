"use client";

import { useMutation } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sessionEstablished,
  sessionCleared,
} from "@/store/slices/session.slice";
import * as authSvc from "../services/auth.service";

export const useSession = () => {
  const { status, user } = useAppSelector((s) => s.session);
  return {
    status,
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "idle" || status === "loading",
  };
};

export const useLogin = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authSvc.login,
    onSuccess: (user) => dispatch(sessionEstablished({ user })),
  });
};

export const useLogout = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: authSvc.logout,
    onSuccess: () => dispatch(sessionCleared()),
  });
};
