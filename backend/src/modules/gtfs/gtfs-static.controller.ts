import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { SystemSetting } from "../../models/systemSetting.model.js";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { Schedule } from "../schedule/schedule.model.js";
import { Trip } from "../trip/trip.model.js";
import { Fare } from "../fare/fare.model.js";
import { buildZip, listZipEntries, sha1Hex } from "../../utils/zip.js";

/**
 * GTFS CSV writer: takes a header row + array of records and returns the
 * canonical comma-separated text. GTFS spec requires CRLF line endings and
 * fields containing commas/quotes/newlines to be quoted with embedded quotes
 * doubled.
 */
const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const csv = (headers: string[], records: Record<string, unknown>[]): string => {
  const lines = [headers.join(",")];
  for (const r of records) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
};

const agencyDefaults = async () => {
  const orgSetting = await SystemSetting.findOne({ key: "organization" }).lean();
  const org = (orgSetting?.value as Record<string, unknown>) || {};
  return {
    agency_id: "default",
    agency_name: (org.name as string) ?? "Public Transit",
    agency_url: (org.url as string) ?? "https://transit.example.com",
    agency_timezone: (org.timezone as string) ?? "Asia/Kolkata",
    agency_phone: (org.phone as string) ?? "",
  };
};

/** Format a Date as HH:MM:SS in a chosen timezone offset (default UTC). */
const hms = (d: Date): string => d.toISOString().slice(11, 19);

/** Format a Date as YYYYMMDD in UTC. */
const ymd = (d: Date): string => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Convert ISO + offset (HH:MM) to HH:MM:SS — for stop_times. */
const isoToGtfsTime = (iso: string): string => {
  const d = new Date(iso);
  return hms(d);
};

export const buildStaticGtfs = async (): Promise<{ zip: Buffer; checksum: string }> => {
  const [agency, routes, stops, schedules, fares] = await Promise.all([
    agencyDefaults(),
    Route.find({}).lean(),
    Stop.find({}).lean(),
    Schedule.find({}).lean(),
    Fare.find({}).lean(),
  ]);

  // agency.txt
  const agencyFile = csv(
    ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_phone"],
    [agency]
  );

  // stops.txt
  const stopRecords = stops.map((s) => ({
    stop_id: s._id.toString(),
    stop_code: (s.code as string) ?? "",
    stop_name: s.name,
    stop_lat: (s.location as { coordinates: number[] }).coordinates[1],
    stop_lon: (s.location as { coordinates: number[] }).coordinates[0],
    location_type: 0,
    wheelchair_boarding: s.accessibility ? 1 : 0,
  }));
  const stopsFile = csv(
    ["stop_id", "stop_code", "stop_name", "stop_lat", "stop_lon", "location_type", "wheelchair_boarding"],
    stopRecords
  );

  // routes.txt
  const routeRecords = routes.map((r) => ({
    route_id: r._id.toString(),
    agency_id: "default",
    route_short_name: r.routeNumber,
    route_long_name: (r.name as string | null) ?? r.routeNumber,
    route_type: 3, // GTFS route_type 3 = bus
    route_desc: "",
  }));
  const routesFile = csv(
    ["route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_desc"],
    routeRecords
  );

  // calendar.txt — synthesised from schedules' daysOfWeek
  // Each schedule becomes a single service_id. service_id = schedule._id
  const serviceIds = new Set<string>();
  const calendarRecords: Record<string, unknown>[] = [];
  const datesRecords: { service_id: string; date: string; exception_type: number }[] = [];
  for (const s of schedules) {
    const sid = s._id.toString();
    if (serviceIds.has(sid)) continue;
    serviceIds.add(sid);
    const dow = (s.daysOfWeek as number[]) || [1, 2, 3, 4, 5, 6, 7];
    const startDate = (s.startDate as Date | undefined) ?? new Date();
    const endDate = (s.endDate as Date | undefined) ?? new Date(Date.now() + 365 * 24 * 3600 * 1000);
    calendarRecords.push({
      service_id: sid,
      monday: dow.includes(1) ? 1 : 0,
      tuesday: dow.includes(2) ? 1 : 0,
      wednesday: dow.includes(3) ? 1 : 0,
      thursday: dow.includes(4) ? 1 : 0,
      friday: dow.includes(5) ? 1 : 0,
      saturday: dow.includes(6) ? 1 : 0,
      sunday: dow.includes(7) ? 1 : 0,
      start_date: ymd(startDate),
      end_date: ymd(endDate),
    });
    // Calendar dates — every day in [startDate, endDate] that matches daysOfWeek
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const jsDay = cur.getUTCDay(); // 0=Sun..6=Sat
      const gtfsDay = jsDay === 0 ? 7 : jsDay; // GTFS: 1=Mon..7=Sun
      if (dow.includes(gtfsDay)) {
        datesRecords.push({ service_id: sid, date: ymd(cur), exception_type: 1 });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  const calendarFile = csv(
    ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
    calendarRecords
  );
  const datesFile = csv(["service_id", "date", "exception_type"], datesRecords);

  // trips.txt + stop_times.txt — materialised from Trip collection (all statuses)
  const trips = await Trip.find({}).lean();
  const tripRecords: Record<string, unknown>[] = [];
  const stopTimeRecords: Record<string, unknown>[] = [];
  let tripSeq = 0;
  for (const t of trips) {
    tripSeq++;
    const route = (t.route as { toString(): string }).toString();
    const tid = t._id.toString();
    const schedule = (t.schedule as { toString(): string } | undefined)?.toString();
    const serviceId = schedule ?? "default";
    if (!serviceIds.has(serviceId)) serviceIds.add(serviceId);
    tripRecords.push({
      route_id: route,
      service_id: serviceId,
      trip_id: tid,
      trip_headsign: "",
      direction_id: 0,
    });

    // If the Trip carries orderedStops or we can derive from the route, build stop_times.
    // Trip doc itself doesn't store orderedStops; fall back to the route's orderedStops.
    const routeDoc = routes.find((r) => r._id.toString() === route);
    const ordered = (routeDoc?.orderedStops as { stopId: { toString(): string }; sequence: number; scheduledOffsetMinutes: number }[]) || [];
    const start = (t.scheduledStartAt as Date | undefined) ?? new Date();
    ordered
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((stop, idx) => {
        const arrival = new Date(start.getTime() + (stop.scheduledOffsetMinutes ?? 0) * 60 * 1000);
        stopTimeRecords.push({
          trip_id: tid,
          arrival_time: hms(arrival),
          departure_time: hms(arrival),
          stop_id: (stop.stopId as { toString(): string }).toString(),
          stop_sequence: idx + 1,
        });
      });
  }
  if (serviceIds.size > 0 && tripRecords.length === 0) {
    // Include at least one synthetic trip per service so a feed consumer can validate.
    for (const sid of serviceIds) {
      tripSeq++;
      tripRecords.push({
        route_id: routeRecords[0]?.route_id ?? "",
        service_id: sid,
        trip_id: `synth-${sid}-${tripSeq}`,
        trip_headsign: "",
        direction_id: 0,
      });
    }
  }
  const tripsFile = csv(
    ["route_id", "service_id", "trip_id", "trip_headsign", "direction_id"],
    tripRecords
  );
  const stopTimesFile = csv(
    ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"],
    stopTimeRecords
  );

  // fare_attributes.txt + fare_rules.txt
  const fareAttrRecords = fares.map((f) => ({
    fare_id: f._id.toString(),
    price: f.amount,
    currency_type: "INR",
    payment_method: 0,
    transfers: 0,
    agency_id: "default",
  }));
  const fareRulesRecords = fares
    .filter((f) => f.route)
    .map((f) => ({
      fare_id: f._id.toString(),
      route_id: f.route ? f.route.toString() : "",
      origin_id: "",
      destination_id: "",
      contains_id: "",
    }));
  const fareAttributesFile = csv(
    ["fare_id", "price", "currency_type", "payment_method", "transfers", "agency_id"],
    fareAttrRecords
  );
  const fareRulesFile = csv(
    ["fare_id", "route_id", "origin_id", "destination_id", "contains_id"],
    fareRulesRecords
  );

  const zip = buildZip([
    { name: "agency.txt", data: agencyFile },
    { name: "stops.txt", data: stopsFile },
    { name: "routes.txt", data: routesFile },
    { name: "calendar.txt", data: calendarFile },
    { name: "calendar_dates.txt", data: datesFile },
    { name: "trips.txt", data: tripsFile },
    { name: "stop_times.txt", data: stopTimesFile },
    { name: "fare_attributes.txt", data: fareAttributesFile },
    { name: "fare_rules.txt", data: fareRulesFile },
  ]);

  return { zip, checksum: sha1Hex(zip) };
};

/** Cached bundle + checksum. 60s TTL keeps load light without stale data. */
interface Bundle { zip: Buffer; checksum: string; generatedAt: number }
let cacheBundle: Bundle | null = null;
const CACHE_MS = 60_000;

const getBundle = async (): Promise<Bundle> => {
  if (cacheBundle && Date.now() - cacheBundle.generatedAt < CACHE_MS) return cacheBundle;
  const { zip, checksum } = await buildStaticGtfs();
  cacheBundle = { zip, checksum, generatedAt: Date.now() };
  return cacheBundle;
};

export const getStaticGtfs = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const bundle = await getBundle();
  const ifNoneMatch = _req.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === bundle.checksum) {
    res.status(304).end();
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="gtfs-static.zip"');
  res.setHeader("ETag", bundle.checksum);
  res.setHeader("Content-Length", bundle.zip.length.toString());
  res.status(200);
  res.end(bundle.zip);
});

export const _internal = { getBundle, listZipEntries };