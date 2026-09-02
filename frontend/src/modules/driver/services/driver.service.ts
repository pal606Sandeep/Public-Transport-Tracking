import { api } from "@/utils/apiClient";
import type { Assignment, DriverPerformance } from "../constant/driver.types";

/** GET /api/v1/me/assignments?date=YYYY-MM-DD */
export const getAssignment = async (date?: string): Promise<Assignment> => {
  const res = await api.get<Assignment>(
    `/me/assignments${date ? `?date=${date}` : ""}`
  );
  return res.data as Assignment;
};

/** POST /api/v1/me/assignments/request  { date, reason? } */
export const requestAssignment = async (input: {
  date: string;
  reason?: string;
}): Promise<{ _id: string; status: string }> => {
  const res = await api.post<{ _id: string; status: string }>(
    "/me/assignments/request",
    input
  );
  return res.data as { _id: string; status: string };
};

/** POST /api/v1/me/attendance/check-in */
export const checkIn = async (): Promise<{ checkIn: string }> => {
  const res = await api.post<{ checkIn: string }>("/me/attendance/check-in", {});
  return res.data as { checkIn: string };
};

/** POST /api/v1/me/attendance/check-out */
export const checkOut = async (): Promise<{
  checkIn: string;
  checkOut: string;
  workedMinutes: number;
}> => {
  const res = await api.post<{
    checkIn: string;
    checkOut: string;
    workedMinutes: number;
  }>("/me/attendance/check-out", {});
  return res.data as {
    checkIn: string;
    checkOut: string;
    workedMinutes: number;
  };
};

/** GET /api/v1/drivers/me/performance */
export const getMyPerformance = async (): Promise<DriverPerformance> => {
  const res = await api.get<{ performance: DriverPerformance }>(
    "/drivers/me/performance"
  );
  return (res.data as { performance: DriverPerformance }).performance;
};
