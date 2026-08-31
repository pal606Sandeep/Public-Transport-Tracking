import { createHash } from "crypto";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { Schedule } from "../schedule/schedule.model.js";

export type SyncResult = {
  data: Record<string, unknown>[];
  checksum: string;
  generatedAt: string;
  count: number;
};

const checksumOf = (payload: unknown): string =>
  createHash("sha1").update(JSON.stringify(payload)).digest("hex");

const buildFilter = (updatedSince?: Date, includeDeleted = false): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (!includeDeleted) filter.deletedAt = null;
  if (updatedSince) filter.updatedAt = { $gt: updatedSince };
  return filter;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchCollection = async (model: any, updatedSince?: Date): Promise<Record<string, unknown>[]> =>
  model.find(buildFilter(updatedSince)).sort({ updatedAt: 1 }).lean();

const makeResult = (data: Record<string, unknown>[]): SyncResult => ({
  data,
  count: data.length,
  checksum: checksumOf(data),
  generatedAt: new Date().toISOString(),
});

export const syncRoutes = async (updatedSince?: Date): Promise<SyncResult> =>
  makeResult(await fetchCollection(Route, updatedSince));

export const syncStops = async (updatedSince?: Date): Promise<SyncResult> =>
  makeResult(await fetchCollection(Stop, updatedSince));

export const syncSchedules = async (updatedSince?: Date): Promise<SyncResult> =>
  makeResult(await fetchCollection(Schedule, updatedSince));

export const syncFares = async (): Promise<SyncResult> =>
  // Fare table is not modelled yet; expose an empty reference set.
  makeResult([]);

export const etagOf = (checksum: string): string => `"${checksum}"`;
