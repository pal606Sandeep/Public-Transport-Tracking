import { Types } from "mongoose";
import { Trip } from "../trip/trip.model.js";
import { Payment } from "../payment/payment.model.js";
import { Ticket } from "../ticket/ticket.model.js";
import { Passenger } from "../passenger/passenger.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Driver } from "../driver/driver.model.js";
import { Route } from "../route/route.model.js";
import { Complaint } from "../complaint/complaint.model.js";

export type AnalyticsRange = { from?: number; to?: number };

const rangeFilter = (dateField: string, r: AnalyticsRange): Record<string, unknown> => {
  const f: Record<string, unknown> = {};
  if (typeof r.from === "number") f[dateField] = { $gte: new Date(r.from) };
  if (typeof r.to === "number") f[dateField] = { $lte: new Date(r.to) };
  return f;
};

const wrap = <T>(f: Record<string, unknown>): Record<string, unknown> => (Object.keys(f).length ? f : {});

type DateParts = { _id: { year: number; month: number; day: number }; count: number };

const toKeyedMap = (rows: DateParts[]): Record<string, number> =>
  Object.fromEntries(rows.map((r) => [`${r._id.year}-${String(r._id.month).padStart(2, "0")}-${String(r._id.day).padStart(2, "0")}`, r.count]));

// ---------------------------------------------------------------------------
// Passenger analytics
// ---------------------------------------------------------------------------

export const passengerAnalytics = async (r: AnalyticsRange = {}): Promise<unknown> => {
  const createdFilter = wrap({ ...rangeFilter("createdAt", r) });

  const total = await Passenger.countDocuments({});
  const totalUsers = total;
  const newPassengers = await Passenger.countDocuments(createdFilter);

  // active = passengers with at least one ticket in the range
  const activeIds = await Ticket.distinct("user", wrap({ status: { $in: ["CONFIRMED", "USED"] }, ...rangeFilter("createdAt", r) }));
  const activeCount = activeIds.length;

  const daily = toKeyedMap(
    await Passenger.aggregate([
      { $match: Object.keys(createdFilter).length ? createdFilter : {} },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])
  );

  const popularRoutes = await Ticket.aggregate([
    { $match: { status: { $in: ["CONFIRMED", "USED"] }, ...wrap(rangeFilter("createdAt", r)) } },
    { $group: { _id: "$route", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: "routes", localField: "_id", foreignField: "_id", as: "route" } },
    { $unwind: { path: "$route", preserveNullAndEmptyArrays: true } },
    { $project: { count: 1, routeId: "$_id", routeNumber: "$route.routeNumber", name: "$route.name", _id: 0 } },
  ]);

  const popularStops = await Ticket.aggregate([
    { $match: { status: { $in: ["CONFIRMED", "USED"] }, ...wrap(rangeFilter("createdAt", r)) } },
    { $group: { _id: "$boardingStopName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, stop: "$_id", count: 1 } },
  ]);

  const peakHours = await Ticket.aggregate([
    { $match: { status: { $in: ["CONFIRMED", "USED"] }, ...wrap(rangeFilter("createdAt", r)) } },
    { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, hour: "$_id", count: 1 } },
  ]);

  // monthly registrations over the full history
  const monthly = await Passenger.aggregate([
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]).then((rows) =>
    rows.map((r) => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      count: r.count,
    }))
  );

  return { total, newPassengers, activePassengers: activeCount, daily, monthly, popularRoutes, popularStops, peakHours };
};

// ---------------------------------------------------------------------------
// Vehicle analytics
// ---------------------------------------------------------------------------

export const vehicleAnalytics = async (r: AnalyticsRange = {}): Promise<unknown> => {
  const tripMatch = { status: "COMPLETED", vehicle: { $ne: null }, ...wrap(rangeFilter("scheduledStartAt", r)) };
  const total = await Vehicle.countDocuments({ deletedAt: null });
  const active = await Vehicle.countDocuments({ deletedAt: null, status: "ACTIVE" });

  const stats = await Trip.aggregate([
    { $match: tripMatch },
    {
      $group: {
        _id: "$vehicle",
        trips: { $sum: 1 },
        distanceKm: { $sum: { $divide: [{ $ifNull: ["$summary.totalDistanceMeters", 0] }, 1000] } },
        onTime: { $avg: { $ifNull: ["$summary.onTimePercentage", null] } },
      },
    },
    {
      $lookup: {
        from: "vehicles",
        localField: "_id",
        foreignField: "_id",
        as: "vehicle",
      },
    },
    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        vehicleId: "$_id",
        registrationNumber: "$vehicle.registrationNumber",
        trips: 1,
        distanceKm: { $round: ["$distanceKm", 1] },
        avgOnTimePercentage: { $round: [{ $ifNull: ["$onTime", 0] }, 1] },
      },
    },
    { $sort: { trips: -1 } },
  ]);

  const totals = await Trip.aggregate([
    { $match: tripMatch },
    {
      $group: {
        _id: null,
        trips: { $sum: 1 },
        distanceKm: { $sum: { $divide: [{ $ifNull: ["$summary.totalDistanceMeters", 0] }, 1000] } },
        vehiclesUsed: { $addToSet: "$vehicle" },
      },
    },
  ]);

  const t = totals[0] ?? { trips: 0, distanceKm: 0, vehiclesUsed: [] };
  const usagePct = total > 0 ? Math.round(((t.vehiclesUsed as unknown[]).length / total) * 1000) / 10 : 0;

  return {
    totalVehicles: total,
    activeVehicles: active,
    utilizationPercentage: usagePct,
    totals: { trips: t.trips, distanceKm: Math.round(t.distanceKm * 10) / 10 },
    perVehicle: stats,
  };
};

// ---------------------------------------------------------------------------
// Driver analytics
// ---------------------------------------------------------------------------

export const driverAnalytics = async (r: AnalyticsRange = {}): Promise<unknown> => {
  const total = await Driver.countDocuments({ deletedAt: null });
  const active = await Driver.countDocuments({ deletedAt: null, status: "ACTIVE" });

  // trips completed + delays per driver
  const tripsByDriver = await Trip.aggregate([
    { $match: { status: "COMPLETED", driver: { $ne: null }, ...wrap(rangeFilter("scheduledStartAt", r)) } },
    {
      $group: {
        _id: "$driver",
        trips: { $sum: 1 },
        delaySecondsTotal: { $sum: { $ifNull: ["$summary.overallDelaySeconds", 0] } },
        delayedTrips: {
          $sum: { $cond: [{ $gt: [{ $ifNull: ["$summary.overallDelaySeconds", 0] }, 300] }, 1, 0] },
        },
      },
    },
    { $lookup: { from: "drivers", localField: "_id", foreignField: "_id", as: "driver" } },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        driverId: "$_id",
        name: "$driver.name",
        employeeId: "$driver.employeeId",
        trips: 1,
        delayedTrips: 1,
        avgDelaySeconds: { $round: [{ $divide: ["$delaySecondsTotal", { $cond: [{ $eq: ["$trips", 0] }, 1, "$trips"] }] }, 1] },
      },
    },
    { $sort: { trips: -1 } },
  ]);

  // complaint count per driver: complaints linked to their trips
  const driverIdByTrip = await Trip.find({ status: "COMPLETED", driver: { $ne: null } }).select("_id driver").lean();
  const tripToDriver = new Map(driverIdByTrip.map((x) => [x._id.toString(), (x.driver as unknown as Types.ObjectId).toString()]));
  const tripIds = [...tripToDriver.keys()];
  const driverComplaints = tripIds.length
    ? await Complaint.aggregate([
        { $match: { relatedTrip: { $in: tripIds.map((x) => new Types.ObjectId(x)) } } },
        { $group: { _id: { $toString: "$relatedTrip" }, count: { $sum: 1 } } },
      ])
    : [];
  const complaintByDriver = new Map<string, number>();
  for (const row of driverComplaints) {
    const driverId = tripToDriver.get(row._id);
    if (driverId) complaintByDriver.set(driverId, (complaintByDriver.get(driverId) ?? 0) + row.count);
  }

  // attendance + working hours from Driver.attendance array
  const attDate: Record<string, unknown> = {};
  if (typeof r.from === "number") attDate.$gte = new Date(r.from);
  if (typeof r.to === "number") attDate.$lte = new Date(r.to);
  const attendanceRows = await Driver.aggregate([
    { $match: { deletedAt: null } },
    { $unwind: "$attendance" },
    ...(Object.keys(attDate).length ? [{ $match: { "attendance.date": attDate } }] : []),
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        days: { $sum: 1 },
        hours: {
          $sum: {
            $divide: [
              { $subtract: [{ $ifNull: ["$attendance.checkOut", "$attendance.date"] }, { $ifNull: ["$attendance.checkIn", "$attendance.date"] }] },
              3600000,
            ],
          },
        },
      },
    },
  ]);

  const perDriver = tripsByDriver.map((row) => ({
    ...row,
    complaints: complaintByDriver.get(String((row as { driverId: string }).driverId)) ?? 0,
    attendanceDays: attendanceRows.find((a) => a._id.toString() === String((row as { driverId: string }).driverId))?.days ?? 0,
    workingHours: Math.round(((attendanceRows.find((a) => a._id.toString() === String((row as { driverId: string }).driverId))?.hours ?? 0) * 10)) / 10,
  }));

  const totalTrips = tripsByDriver.reduce((s, x) => s + x.trips, 0);
  const totalDelayed = tripsByDriver.reduce((s, x) => s + x.delayedTrips, 0);
  const driverIds = await Driver.find({ deletedAt: null }).select("_id").lean();
  const complaintSum = [...complaintByDriver.values()].reduce((s, x) => s + x, 0);
  const totalAttendanceDays = perDriver.reduce((s, x) => s + x.attendanceDays, 0);

  return {
    totalDrivers: total,
    activeDrivers: active,
    totals: {
      tripsCompleted: totalTrips,
      delayedTrips: totalDelayed,
      complaints: complaintSum,
      avgAttendancePerDriver: driverIds.length ? Math.round((totalAttendanceDays / driverIds.length) * 10) / 10 : 0,
    },
    perDriver,
  };
};

// ---------------------------------------------------------------------------
// Route analytics
// ---------------------------------------------------------------------------

export const routeAnalytics = async (r: AnalyticsRange = {}): Promise<unknown> => {
  const tripMatch = { status: "COMPLETED", ...wrap(rangeFilter("scheduledStartAt", r)) };
  const total = await Route.countDocuments({ deletedAt: null });

  const perRoute = await Trip.aggregate([
    { $match: tripMatch },
    {
      $group: {
        _id: "$route",
        trips: { $sum: 1 },
        avgTravelSeconds: { $avg: { $subtract: ["$endTime", "$startTime"] } },
        avgDistanceKm: { $avg: { $divide: [{ $ifNull: ["$summary.totalDistanceMeters", 0] }, 1000] } },
        avgOnTime: { $avg: { $ifNull: ["$summary.onTimePercentage", 0] } },
        avgDelaySeconds: { $avg: { $ifNull: ["$summary.overallDelaySeconds", 0] } },
        delayedTrips: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$summary.overallDelaySeconds", 0] }, 300] }, 1, 0] } },
      },
    },
    { $lookup: { from: "routes", localField: "_id", foreignField: "_id", as: "route" } },
    { $unwind: { path: "$route", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        routeId: "$_id",
        routeNumber: "$route.routeNumber",
        name: "$route.name",
        trips: 1,
        averageTravelMinutes: { $round: [{ $divide: [{ $ifNull: ["$avgTravelSeconds", 0] }, 60] }, 1] },
        averageDistanceKm: { $round: ["$avgDistanceKm", 1] },
        averageOnTimePercentage: { $round: ["$avgOnTime", 1] },
        averageDelaySeconds: { $round: ["$avgDelaySeconds", 1] },
        delayedTrips: 1,
      },
    },
    { $sort: { trips: -1 } },
  ]);

  const totals = await Trip.aggregate([
    { $match: tripMatch },
    {
      $group: {
        _id: null,
        trips: { $sum: 1 },
        avgOnTime: { $avg: { $ifNull: ["$summary.onTimePercentage", 0] } },
        avgDelay: { $avg: { $ifNull: ["$summary.overallDelaySeconds", 0] } },
        delayedTrips: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$summary.overallDelaySeconds", 0] }, 300] }, 1, 0] } },
      },
    },
  ]);
  const t = totals[0] ?? { trips: 0, avgOnTime: 0, avgDelay: 0, delayedTrips: 0 };

  return {
    totalRoutes: total,
    totals: {
      trips: t.trips,
      averageOnTimePercentage: Math.round(t.avgOnTime * 10) / 10,
      averageDelaySeconds: Math.round(t.avgDelay * 10) / 10,
      delayedTrips: t.delayedTrips,
    },
    perRoute,
  };
};

// ---------------------------------------------------------------------------
// Revenue analytics
// ---------------------------------------------------------------------------

export const revenueAnalytics = async (r: AnalyticsRange = {}): Promise<unknown> => {
  const match = { status: "SUCCESS", ...wrap(rangeFilter("confirmedAt", r)) };

  const daily = await Payment.aggregate([
    { $match: match },
    { $group: { _id: { year: { $year: "$confirmedAt" }, month: { $month: "$confirmedAt" }, day: { $dayOfMonth: "$confirmedAt" } }, amount: { $sum: "$amount" } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    { $project: { _id: 0, date: { $concat: [{ $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-", { $toString: "$_id.day" }] }, amount: 1 } },
  ]);

  const monthly = await Payment.aggregate([
    { $match: match },
    { $group: { _id: { year: { $year: "$confirmedAt" }, month: { $month: "$confirmedAt" } }, amount: { $sum: "$amount" } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $project: { _id: 0, month: { $concat: [{ $toString: "$_id.year" }, "-", { $toString: "$_id.month" }] }, amount: 1 } },
  ]);

  const byMethod = await Payment.aggregate([
    { $match: match },
    { $group: { _id: "$method", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $project: { _id: 0, method: "$_id", amount: 1, count: 1 } },
    { $sort: { amount: -1 } },
  ]);

  const byRoute = await Payment.aggregate([
    { $match: match },
    // route source: payment.metadata.routeId (set on ticket payment) or via ticket
    {
      $group: {
        _id: { $ifNull: ["$metadata.routeId", "unknown"] },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, routeId: { $toString: "$_id" }, amount: { $round: ["$amount", 2] }, count: 1 } },
    { $sort: { amount: -1 } },
  ]);

  const totals = await Payment.aggregate([
    { $match: match },
    { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const t = totals[0] ?? { amount: 0, count: 0 };

  return { totals: { revenue: Math.round(t.amount * 100) / 100, transactions: t.count }, daily, monthly, byMethod, byRoute };
};
