import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Schedule,
  ScheduleInput,
  ScheduleListParams,
  GenerateResult,
} from "../constant/schedule.types";

const BASE = "/admin/schedules";

export async function listSchedules(
  params: ScheduleListParams = {}
): Promise<{ schedules: Schedule[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.route) p.set("route", params.route);
  if (typeof params.isActive === "boolean")
    p.set("isActive", String(params.isActive));
  const res = await api.get<{ schedules: Schedule[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    schedules: res.data?.schedules ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getSchedule(id: string): Promise<Schedule> {
  const res = await api.get<{ schedule: Schedule }>(`${BASE}/${id}`);
  return (res.data as { schedule: Schedule }).schedule;
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const res = await api.post<{ schedule: Schedule }>(BASE, input);
  return (res.data as { schedule: Schedule }).schedule;
}

export async function updateSchedule(
  id: string,
  input: Partial<ScheduleInput>
): Promise<Schedule> {
  const res = await api.patch<{ schedule: Schedule }>(`${BASE}/${id}`, input);
  return (res.data as { schedule: Schedule }).schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}

export async function generateTrips(
  id: string,
  range: { from: string; to: string }
): Promise<GenerateResult> {
  const res = await api.post<GenerateResult>(`${BASE}/${id}/generate`, range);
  return res.data as GenerateResult;
}
