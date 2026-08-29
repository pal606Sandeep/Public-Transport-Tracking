import * as userApi from "./user.api";
import type { User, UserInput } from "./user.types";

export const getAllUsers = async (): Promise<User[]> => {
  const res = await userApi.getAll();
  return res.data ?? [];
};

export const getUserById = async (
  id: string
): Promise<User | null> => {
  const res = await userApi.getById(id);
  return res.data ?? null;
};

export const createUser = async (
  payload: UserInput
): Promise<User | null> => {
  const res = await userApi.create(payload);
  return res.data ?? null;
};

export const updateUser = async (
  id: string,
  payload: Partial<UserInput>
): Promise<User | null> => {
  const res = await userApi.update(id, payload);
  return res.data ?? null;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const res = await userApi.remove(id);
  return res.success;
};
