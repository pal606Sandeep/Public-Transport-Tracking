export const FREQUENCY_TYPES = [
  "DAILY",
  "WEEKLY",
  "WEEKEND",
  "HOLIDAY",
  "SPECIAL",
] as const;
export type FrequencyType = (typeof FREQUENCY_TYPES)[number];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface Schedule {
  _id: string;
  name: string;
  code: string | null;
  route: string;
  vehicle: string | null;
  driver: string | null;
  conductor: string | null;
  frequencyType: FrequencyType;
  daysOfWeek: number[];
  departureTimes: string[];
  durationMin: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  name: string;
  code?: string | null;
  route: string;
  vehicle?: string | null;
  driver?: string | null;
  conductor?: string | null;
  frequencyType?: FrequencyType;
  daysOfWeek?: number[];
  departureTimes: string[];
  durationMin?: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}

export interface ScheduleListParams {
  page?: number;
  limit?: number;
  search?: string;
  route?: string;
  isActive?: boolean;
}

export interface GenerateResult {
  count: number;
  trips: unknown[];
}
