import { Types } from "mongoose";
import { OccupancyReading } from "./occupancy.model.js";

export type OccupancyAnalyticsFilter = {
  tripId?: string;
  routeId?: string;
  vehicleId?: string;
  from?: number;
  to?: number;
};

/**
 * P1-47 — crowding analytics. Returns the occupancy distribution (LOW /
 * MODERATE / CROWDED) for a trip / route / vehicle over a time window from the
 * persisted OCCUPANCY_CHANGED history, plus a per-level breakdown with
 * percentages and the latest reading. Feed this into the P1-50 reports.
 */
export const occupancyAnalytics = async (input: OccupancyAnalyticsFilter): Promise<unknown> => {
  const match: Record<string, unknown> = {};
  if (input.tripId) match.trip = new Types.ObjectId(input.tripId);
  if (input.routeId) match.route = new Types.ObjectId(input.routeId);
  if (input.vehicleId) match.vehicle = new Types.ObjectId(input.vehicleId);

  const range: Record<string, unknown> = {};
  if (typeof input.from === "number") range.$gte = new Date(input.from);
  if (typeof input.to === "number") range.$lte = new Date(input.to);
  if (Object.keys(range).length) match.occurredAt = range;

  const total = await OccupancyReading.countDocuments(match);
  const byLevel = await OccupancyReading.aggregate([
    { $match: match },
    { $group: { _id: "$level", count: { $sum: 1 } } },
  ]);

  const levelCounts: Record<string, number> = { LOW: 0, MODERATE: 0, CROWDED: 0 };
  for (const row of byLevel) levelCounts[row._id as string] = row.count as number;

  const distribution = (["LOW", "MODERATE", "CROWDED"] as const).map((level) => ({
    level,
    count: levelCounts[level],
    percentage: total > 0 ? Math.round((levelCounts[level] / total) * 1000) / 10 : 0,
  }));

  const latest = await OccupancyReading.findOne(match).sort({ occurredAt: -1 }).lean();

  return {
    filters: { tripId: input.tripId ?? null, routeId: input.routeId ?? null, vehicleId: input.vehicleId ?? null },
    total,
    distribution,
    latest: latest
      ? {
          level: latest.level,
          passengerCount: latest.passengerCount,
          capacity: latest.capacity,
          occupancyPercentage: latest.occupancyPercentage,
          occurredAt: latest.occurredAt,
        }
      : null,
  };
};
