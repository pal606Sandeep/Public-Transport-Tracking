"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "@/modules/auth/hooks/useAuth";
import * as svc from "../services/notification.service";
import type { PreferencesPatch } from "../constant/notification.types";

export const notificationKeys = {
  list: (unreadOnly: boolean) =>
    ["notifications", "list", unreadOnly] as const,
  prefs: ["notifications", "preferences"] as const,
};

export const useNotifications = (unreadOnly = false) => {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: () => svc.listNotifications({ unreadOnly, limit: 40 }),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
};

/** Lightweight unread count for a header badge. */
export const useUnreadCount = (): number => {
  const { data } = useNotifications(false);
  return data?.unread ?? 0;
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read?: boolean }) =>
      svc.markRead(id, read ?? true),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", "list"] }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.markAllRead,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", "list"] }),
  });
};

export const useNotificationPrefs = () => {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: notificationKeys.prefs,
    queryFn: svc.getPreferences,
    enabled: isAuthenticated,
  });
};

export const useUpdatePrefs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesPatch) => svc.updatePreferences(patch),
    onSuccess: (prefs) => qc.setQueryData(notificationKeys.prefs, prefs),
  });
};
