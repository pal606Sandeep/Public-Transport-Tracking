"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/user.service";
import type { UserInput, UserListParams } from "../services/user.service";

export const userKeys = {
  all: ["users"] as const,
  list: (p: UserListParams) => ["users", "list", p] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

export const useUsers = (params: UserListParams) =>
  useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => svc.listUsers(params),
  });

export const useUser = (id: string) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => svc.getUser(id),
    enabled: Boolean(id),
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserInput) => svc.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};

export const useUpdateUser = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UserInput>) => svc.updateUser(id, input),
    onSuccess: (user) => {
      qc.setQueryData(userKeys.detail(id), user);
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

export const useSetUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      svc.setUserActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
};
