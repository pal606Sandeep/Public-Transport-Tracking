import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import redisClient from "../../../config/redis.js";
import { Route } from "../../route/route.model.js";
import { Trip } from "../../trip/trip.model.js";
import logger from "../../../utils/logger.js";

const { transit_realtime: GtfsRT } = GtfsRealtimeBindings;

export interface GTFSVehiclePosition {
  entityId: string;
  vehicleId: string;
  tripId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  timestamp: number;
}

export interface GTFSTripUpdate {
  entityId: string;
  tripId: string;
  routeId: string;
  currentStopId: string;
  currentStopSequence: number;
  timestamp: number;
}

export interface GTFSAlert {
  entityId: string;
  alertId: string;
  activePeriod: { start: number; end: number };
  informedEntity: Array<{ agencyId: string; routeId?: string; stopId?: string }>;
  headerText: string;
  descriptionText: string;
  timestamp: number;
}

const prefixEntity = (id: string): string => `E_${id}`;

export const getGTFSVehiclePositions = async (): Promise<GTFSVehiclePosition[]> => {
  const vehicles: GTFSVehiclePosition[] = [];

  const trips = await Trip.find({ status: { $in: ["ACTIVE", "PAUSED"] } })
    .select("vehicle route driver")
    .lean();

  for (const trip of trips) {
    const vehicleId = trip.vehicle?.toString();
    if (!vehicleId) continue;

    const raw = await redisClient.get(`vehicle:${vehicleId}:location`);
    if (!raw) continue;

    try {
      const loc = JSON.parse(raw) as { lat: number; lon: number; speed: number; heading: number; timestamp: number };
      vehicles.push({
        entityId: prefixEntity(`VP_${vehicleId}`),
        vehicleId,
        tripId: trip._id.toString(),
        routeId: trip.route?.toString() || "",
        latitude: loc.lat,
        longitude: loc.lon,
        bearing: loc.heading || 0,
        speed: loc.speed || 0,
        timestamp: loc.timestamp || Date.now(),
      });
    } catch {
      continue;
    }
  }

  return vehicles;
};

export const getGTFSTripUpdates = async (): Promise<GTFSTripUpdate[]> => {
  const updates: GTFSTripUpdate[] = [];

  const trips = await Trip.find({ status: { $in: ["ACTIVE", "PAUSED"] } })
    .select("vehicle route currentStop")
    .lean();

  for (const trip of trips) {
    const vehicleId = trip.vehicle?.toString();
    const routeId = trip.route?.toString();
    if (!vehicleId) continue;

    const raw = await redisClient.get(`vehicle:${vehicleId}:status`);
    const currentStopProcessing = trip.currentStop?.toString();

    updates.push({
      entityId: prefixEntity(`TU_${trip._id.toString()}`),
      tripId: trip._id.toString(),
      routeId: routeId || "",
      currentStopId: currentStopProcessing || "",
      currentStopSequence: 0,
      timestamp: Date.now(),
    });
  }

  return updates;
};

export const getGTFSAlerts = async (): Promise<GTFSAlert[]> => {
  const now = Date.now();
  const alerts: GTFSAlert[] = [];

  const routes = await Route.find({ status: "ACTIVE" }).select("_id routeNumber").lean().catch(() => []);

  const ROUTE_DEVIATION_ALERT_IDS = new Set<string>();

  const redisKeys = await redisClient.keys("vehicle:*:status").catch(() => []);
  for (const key of redisKeys) {
    const vehicleId = key.replace("vehicle:", "").replace(":status", "");
    const raw = await redisClient.hgetall(key);
    const status = raw?.status;
    if (status === "OFFLINE" || status === "STALE") {
      alerts.push({
        entityId: prefixEntity(`ALERT_OFFLINE_${vehicleId}`),
        alertId: `offline-${vehicleId}`,
        activePeriod: { start: now, end: now + 24 * 60 * 60 * 1000 },
        informedEntity: [{ agencyId: "pta" }],
        headerText: "Vehicle Offline",
        descriptionText: "A vehicle is currently offline.",
        timestamp: now,
      });
    }
  }

  return alerts;
};

/**
 * P2-29 — real GTFS-Realtime protobuf encoders (not plain JSON) so
 * third-party consumers (incl. Google Maps) can decode these with any
 * standard GTFS-RT parser. Entity ids must line up with the static
 * `gtfs/static.zip` export (P1-55) — vehicle/trip/route ids are the same
 * Mongo ObjectId strings used there.
 */
const toSeconds = (ms: number): number => Math.floor(ms / 1000);

export const buildVehiclePositionsFeed = async (): Promise<Buffer> => {
  const vehicles = await getGTFSVehiclePositions();

  const message = GtfsRT.FeedMessage.create({
    header: GtfsRT.FeedHeader.create({
      gtfsRealtimeVersion: "2.0",
      incrementality: GtfsRT.FeedHeader.Incrementality.FULL_DATASET,
      timestamp: toSeconds(Date.now()),
    }),
    entity: vehicles.map((v) =>
      GtfsRT.FeedEntity.create({
        id: v.entityId,
        vehicle: GtfsRT.VehiclePosition.create({
          trip: GtfsRT.TripDescriptor.create({ tripId: v.tripId, routeId: v.routeId }),
          vehicle: GtfsRT.VehicleDescriptor.create({ id: v.vehicleId }),
          position: GtfsRT.Position.create({
            latitude: v.latitude,
            longitude: v.longitude,
            bearing: v.bearing,
            speed: v.speed / 3.6,
          }),
          timestamp: toSeconds(v.timestamp),
        }),
      })
    ),
  });

  return Buffer.from(GtfsRT.FeedMessage.encode(message).finish());
};

export const buildTripUpdatesFeed = async (): Promise<Buffer> => {
  const updates = await getGTFSTripUpdates();

  const message = GtfsRT.FeedMessage.create({
    header: GtfsRT.FeedHeader.create({
      gtfsRealtimeVersion: "2.0",
      incrementality: GtfsRT.FeedHeader.Incrementality.FULL_DATASET,
      timestamp: toSeconds(Date.now()),
    }),
    entity: updates.map((u) =>
      GtfsRT.FeedEntity.create({
        id: u.entityId,
        tripUpdate: GtfsRT.TripUpdate.create({
          trip: GtfsRT.TripDescriptor.create({ tripId: u.tripId, routeId: u.routeId }),
          stopTimeUpdate: u.currentStopId
            ? [
                GtfsRT.TripUpdate.StopTimeUpdate.create({
                  stopId: u.currentStopId,
                  stopSequence: u.currentStopSequence || undefined,
                }),
              ]
            : [],
          timestamp: toSeconds(u.timestamp),
        }),
      })
    ),
  });

  return Buffer.from(GtfsRT.FeedMessage.encode(message).finish());
};

export const buildAlertsFeed = async (): Promise<Buffer> => {
  const alerts = await getGTFSAlerts();

  const message = GtfsRT.FeedMessage.create({
    header: GtfsRT.FeedHeader.create({
      gtfsRealtimeVersion: "2.0",
      incrementality: GtfsRT.FeedHeader.Incrementality.FULL_DATASET,
      timestamp: toSeconds(Date.now()),
    }),
    entity: alerts.map((a) =>
      GtfsRT.FeedEntity.create({
        id: a.entityId,
        alert: GtfsRT.Alert.create({
          activePeriod: [
            GtfsRT.TimeRange.create({
              start: toSeconds(a.activePeriod.start),
              end: toSeconds(a.activePeriod.end),
            }),
          ],
          informedEntity: a.informedEntity.map((e) =>
            GtfsRT.EntitySelector.create({
              agencyId: e.agencyId,
              routeId: e.routeId,
              stopId: e.stopId,
            })
          ),
          headerText: GtfsRT.TranslatedString.create({
            translation: [GtfsRT.TranslatedString.Translation.create({ text: a.headerText, language: "en" })],
          }),
          descriptionText: GtfsRT.TranslatedString.create({
            translation: [GtfsRT.TranslatedString.Translation.create({ text: a.descriptionText, language: "en" })],
          }),
        }),
      })
    ),
  });

  return Buffer.from(GtfsRT.FeedMessage.encode(message).finish());
};
