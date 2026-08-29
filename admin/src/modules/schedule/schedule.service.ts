import * as scheduleApi from "./schedule.api";
import type { Schedule, ScheduleInput } from "./schedule.types";

export const getAllSchedules = async (): Promise<Schedule[]> => {
  const res = await scheduleApi.getAll();
  return res.data ?? [];
};

export const getScheduleById = async (
  id: string
): Promise<Schedule | null> => {
  const res = await scheduleApi.getById(id);
  return res.data ?? null;
};

export const createSchedule = async (
  payload: ScheduleInput
): Promise<Schedule | null> => {
  const res = await scheduleApi.create(payload);
  return res.data ?? null;
};

export const updateSchedule = async (
  id: string,
  payload: Partial<ScheduleInput>
): Promise<Schedule | null> => {
  const res = await scheduleApi.update(id, payload);
  return res.data ?? null;
};

export const deleteSchedule = async (id: string): Promise<boolean> => {
  const res = await scheduleApi.remove(id);
  return res.success;
};
