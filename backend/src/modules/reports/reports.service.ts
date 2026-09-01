import { Types } from "mongoose";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Driver } from "../driver/driver.model.js";
import { Conductor } from "../conductor/conductor.model.js";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { Trip } from "../trip/trip.model.js";
import { Passenger } from "../passenger/passenger.model.js";
import { Ticket } from "../ticket/ticket.model.js";
import { Payment } from "../payment/payment.model.js";
import { Complaint } from "../complaint/complaint.model.js";
import { MaintenanceRecord } from "../maintenance/maintenance.model.js";
import { Incident } from "../incident/incident.model.js";
import { AppError } from "../../utils/AppError.js";

export interface ReportQuery {
  from?: number;
  to?: number;
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  page?: number;
  limit?: number;
}

export type ReportTable = { columns: string[]; rows: (string | number)[][] };

const oid = (v?: string): Types.ObjectId | undefined => (v ? new Types.ObjectId(v) : undefined);

const rangeFilter = (field: string, q: ReportQuery): Record<string, unknown> => {
  const f: Record<string, unknown> = {};
  if (typeof q.from === "number") f[field] = { $gte: new Date(q.from) };
  if (typeof q.to === "number") f[field] = { ...((f[field] as object) ?? {}), $lte: new Date(q.to) };
  return f;
};
const has = (o: Record<string, unknown>): boolean => Object.keys(o).length > 0;

const ts = (d: unknown, field: "createdAt" | "updatedAt"): string => {
  const v = (d as Record<string, unknown>)[field];
  return v ? new Date(v as Date).toISOString() : "";
};

type Fetcher = (q: ReportQuery) => Promise<ReportTable>;

const vehiclesReport: Fetcher = async () => {
  const docs = await Vehicle.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(500).lean();
  return {
    columns: ["registrationNumber", "model", "type", "capacity", "status", "updatedAt"],
    rows: docs.map((d) => [d.registrationNumber, d.model ?? "", d.type, d.capacity, d.status, ts(d, "updatedAt")]),
  };
};

const driversReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q.driverId) filter._id = new Types.ObjectId(q.driverId);
  const docs = await Driver.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return {
    columns: ["name", "employeeId", "licenseNumber", "status", "complaintsCount", "updatedAt"],
    rows: docs.map((d) => [d.name, d.employeeId, d.licenseNumber, d.status, d.complaintsCount ?? 0, ts(d, "updatedAt")]),
  };
};

const conductorsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q.driverId) filter._id = new Types.ObjectId(q.driverId);
  const docs = await Conductor.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  return {
    columns: ["name", "employeeId", "status", "updatedAt"],
    rows: docs.map((d) => {
      const doc = d as { name?: string; employeeId?: string; status?: string };
      return [doc.name ?? "", doc.employeeId ?? "", doc.status ?? "", ts(doc, "updatedAt")];
    }),
  };
};

const routesReport: Fetcher = async () => {
  const docs = await Route.find({ deletedAt: null }).sort({ routeNumber: 1 }).limit(500).lean();
  return {
    columns: ["routeNumber", "name", "distanceKm", "estimatedDurationMin", "status"],
    rows: docs.map((d) => [d.routeNumber, d.name ?? "", d.distanceKm ?? 0, d.estimatedDurationMin ?? 0, d.status]),
  };
};

const stopsReport: Fetcher = async () => {
  const docs = await Stop.find({ deletedAt: null }).sort({ name: 1 }).limit(500).lean();
  return {
    columns: ["name", "code", "lat", "lng"],
    rows: docs.map((d) => [d.name, d.code ?? "", (d.location?.coordinates?.[1] as number) ?? 0, (d.location?.coordinates?.[0] as number) ?? 0]),
  };
};

const tripsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { ...has(rangeFilter("scheduledStartAt", q)) ? rangeFilter("scheduledStartAt", q) : {} };
  if (q.routeId) filter.route = new Types.ObjectId(q.routeId);
  if (q.vehicleId) filter.vehicle = new Types.ObjectId(q.vehicleId);
  if (q.driverId) filter.driver = new Types.ObjectId(q.driverId);
  const docs = await Trip.find(filter)
    .populate("route", "routeNumber")
    .sort({ scheduledStartAt: -1 })
    .limit(1000)
    .lean();
  return {
    columns: ["route", "status", "scheduledStartAt", "distanceKm", "onTimePercentage", "overallDelaySeconds"],
    rows: docs.map((d) => [
      (d.route as unknown as { routeNumber?: string })?.routeNumber ?? "",
      d.status,
      new Date((d.scheduledStartAt as Date) ?? (d as { createdAt?: Date }).createdAt!).toISOString(),
      Math.round(((d.summary?.totalDistanceMeters as number) ?? 0) / 1000),
      Math.round((d.summary?.onTimePercentage as number) ?? 0),
      Math.round((d.summary?.overallDelaySeconds as number) ?? 0),
    ]),
  };
};

const passengersReport: Fetcher = async (q) => {
  const filter = has(rangeFilter("createdAt", q)) ? rangeFilter("createdAt", q) : {};
  const docs = await Passenger.find(filter).populate("userId", "name email").sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["name", "email", "blocked", "createdAt"],
    rows: docs.map((d) => {
      const u = d.userId as unknown as { name?: string; email?: string } | null;
      return [u?.name ?? "", u?.email ?? "", d.blocked ? "yes" : "no", ts(d, "createdAt")];
    }),
  };
};

const ticketsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { ...has(rangeFilter("createdAt", q)) ? rangeFilter("createdAt", q) : {} };
  if (q.routeId) filter.route = new Types.ObjectId(q.routeId);
  if (q.vehicleId) filter.vehicle = new Types.ObjectId(q.vehicleId);
  const docs = await Ticket.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["routeNumber", "amount", "paymentMethod", "status", "createdAt"],
    rows: docs.map((d) => [d.routeNumber, d.amount, d.paymentMethod, d.status, new Date(d.createdAt as Date).toISOString()]),
  };
};

const paymentsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { ...has(rangeFilter("createdAt", q)) ? rangeFilter("createdAt", q) : {} };
  if (q.vehicleId) filter["metadata.vehicleId"] = q.vehicleId;
  const docs = await Payment.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["amount", "method", "provider", "status", "payableFor", "confirmedAt"],
    rows: docs.map((d) => [
      d.amount,
      d.method,
      d.provider,
      d.status,
      d.payableFor,
      d.confirmedAt ? new Date(d.confirmedAt).toISOString() : "",
    ]),
  };
};

const revenueReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { status: "SUCCESS", ...has(rangeFilter("confirmedAt", q)) ? rangeFilter("confirmedAt", q) : {} };
  if (q.routeId) filter["metadata.routeId"] = q.routeId;
  const rows = await Payment.aggregate([
    { $match: filter },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt" } }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return {
    columns: ["date", "revenue", "transactions"],
    rows: rows.map((r) => [r._id, Math.round(r.revenue * 100) / 100, r.count]),
  };
};

const complaintsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { ...has(rangeFilter("createdAt", q)) ? rangeFilter("createdAt", q) : {} };
  if (q.routeId) filter.relatedRoute = new Types.ObjectId(q.routeId);
  if (q.vehicleId) filter.relatedVehicle = new Types.ObjectId(q.vehicleId);
  const docs = await Complaint.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["category", "subject", "status", "priority", "createdAt"],
    rows: docs.map((d) => [d.category, d.subject, d.status, d.priority, ts(d, "createdAt")]),
  };
};

const maintenanceReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { deletedAt: null };
  const sd = rangeFilter("scheduledDate", q);
  if (has(sd)) Object.assign(filter, sd);
  if (q.vehicleId) filter.vehicle = new Types.ObjectId(q.vehicleId);
  const docs = await MaintenanceRecord.find(filter).populate("vehicle", "registrationNumber").sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["type", "title", "status", "cost", "scheduledDate", "completedAt"],
    rows: docs.map((d) => [
      d.type,
      d.title,
      d.status,
      d.cost ?? 0,
      d.scheduledDate ? new Date(d.scheduledDate).toISOString() : "",
      d.completedAt ? new Date(d.completedAt).toISOString() : "",
    ]),
  };
};

const incidentsReport: Fetcher = async (q) => {
  const filter: Record<string, unknown> = { deletedAt: null, ...has(rangeFilter("createdAt", q)) ? rangeFilter("createdAt", q) : {} };
  if (q.vehicleId) filter.vehicleId = new Types.ObjectId(q.vehicleId);
  const docs = await Incident.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
  return {
    columns: ["type", "title", "status", "severity", "source", "createdAt"],
    rows: docs.map((d) => [
      d.type,
      d.title,
      d.status,
      d.severity,
      d.source,
      ts(d, "createdAt"),
    ]),
  };
};

export const REPORT_TYPES = [
  "vehicles",
  "drivers",
  "conductors",
  "routes",
  "stops",
  "trips",
  "passengers",
  "tickets",
  "payments",
  "revenue",
  "complaints",
  "maintenance",
  "incidents",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

const NOTE: Record<ReportType, Fetcher> = {
  vehicles: vehiclesReport,
  drivers: driversReport,
  conductors: conductorsReport,
  routes: routesReport,
  stops: stopsReport,
  trips: tripsReport,
  passengers: passengersReport,
  tickets: ticketsReport,
  payments: paymentsReport,
  revenue: revenueReport,
  complaints: complaintsReport,
  maintenance: maintenanceReport,
  incidents: incidentsReport,
};

export const getReport = async (type: string, q: ReportQuery): Promise<ReportTable> => {
  const fetcher = NOTE[type as ReportType];
  if (!fetcher) throw AppError.notFound("Unknown report type", "REPORT_TYPE_NOT_FOUND");
  return fetcher(q);
};
