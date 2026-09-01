import { subscribeToEvent, type TrackingEvent } from "./event-bus.service.js";
import { Trip } from "../../modules/trip/trip.model.js";
import logger from "../../utils/logger.js";

const unsubscribe = subscribeToEvent("TRIP_STATS_READY", async (event: TrackingEvent) => {
  const { tripId, ...stats } = event.payload as Record<string, unknown>;

  if (!tripId || typeof tripId !== "string") {
    logger.warn("TRIP_STATS_READY missing tripId", { traceId: event.traceId });
    return;
  }

  try {
    await Trip.findByIdAndUpdate(tripId, {
      summary: {
        totalDistanceMeters: (stats as { totalDistanceMeters?: number }).totalDistanceMeters ?? null,
        movingTimeSeconds: (stats as { movingTimeSeconds?: number }).movingTimeSeconds ?? null,
        idleTimeSeconds: (stats as { idleTimeSeconds?: number }).idleTimeSeconds ?? null,
        stopsServed: (stats as { stopsServed?: number }).stopsServed ?? null,
        onTimePercentage: (stats as { onTimePercentage?: number }).onTimePercentage ?? null,
        overallDelaySeconds: (stats as { overallDelaySeconds?: number }).overallDelaySeconds ?? null,
        averageSpeedKmh: (stats as { averageSpeedKmh?: number }).averageSpeedKmh ?? null,
        maxSpeedKmh: (stats as { maxSpeedKmh?: number }).maxSpeedKmh ?? null,
        path: (stats as { path?: unknown }).path ?? null,
        perStopActualVsScheduled: (stats as { perStopActualVsScheduled?: unknown }).perStopActualVsScheduled ?? null,
        tripStartedAt: (stats as { tripStartedAt?: number }).tripStartedAt ?? null,
        tripEndedAt: (stats as { tripEndedAt?: number }).tripEndedAt ?? null,
        readyAt: Date.now(),
      },
    });
    logger.info(`Trip summary stored for ${tripId}`, { traceId: event.traceId });
  } catch (err) {
    logger.error(`Failed to store trip summary for ${tripId}: ${(err as Error).message}`, {
      traceId: event.traceId,
    });
  }
});

export const startTripStatsConsumer = (): void => {
  logger.info("TRIP_STATS_READY consumer started");
};

export const stopTripStatsConsumer = (): void => {
  unsubscribe();
  logger.info("TRIP_STATS_READY consumer stopped");
};
