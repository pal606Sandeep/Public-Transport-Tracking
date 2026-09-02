import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  language: string;
  avatarKey: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserInput {
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  password?: string;
  language?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

const BASE = "/admin/users";

export async function listUsers(
  params: UserListParams = {}
): Promise<{ users: AdminUser[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.role) p.set("role", params.role);
  const res = await api.get<{ users: AdminUser[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    users: res.data?.users ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await api.get<{ user: AdminUser }>(`${BASE}/${id}`);
  return (res.data as { user: AdminUser }).user;
}

export async function createUser(input: UserInput): Promise<AdminUser> {
  const res = await api.post<{ user: AdminUser }>(BASE, input);
  return (res.data as { user: AdminUser }).user;
}

export async function updateUser(
  id: string,
  input: Partial<UserInput>
): Promise<AdminUser> {
  const res = await api.patch<{ user: AdminUser }>(`${BASE}/${id}`, input);
  return (res.data as { user: AdminUser }).user;
}

export async function setUserActive(
  id: string,
  active: boolean
): Promise<void> {
  await api.post(`${BASE}/${id}/${active ? "activate" : "deactivate"}`);
}

export async function deleteUser(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
