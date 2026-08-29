import * as routeApi from "./route.api";
import type { Route, RouteInput } from "./route.types";

export const getAllRoutes = async (): Promise<Route[]> => {
  const res = await routeApi.getAll();
  return res.data ?? [];
};

export const getRouteById = async (
  id: string
): Promise<Route | null> => {
  const res = await routeApi.getById(id);
  return res.data ?? null;
};

export const createRoute = async (
  payload: RouteInput
): Promise<Route | null> => {
  const res = await routeApi.create(payload);
  return res.data ?? null;
};

export const updateRoute = async (
  id: string,
  payload: Partial<RouteInput>
): Promise<Route | null> => {
  const res = await routeApi.update(id, payload);
  return res.data ?? null;
};

export const deleteRoute = async (id: string): Promise<boolean> => {
  const res = await routeApi.remove(id);
  return res.success;
};
