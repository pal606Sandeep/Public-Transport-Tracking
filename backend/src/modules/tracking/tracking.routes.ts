import { Router } from "express";
import {
  updateLocation,
  updateBulkLocation,
  heartbeat,
  sos,
  sosAck,
  submitOccupancy,
  getLocation,
  getStatus,
  getETA,
  getOccupancy,
  getVehicleSnapshot,
  getRouteSnapshot,
  getTripSnapshot,
  getTripHistory,
} from "./tracking.controller.js";
import { authenticate, authorizeRoles, guestOrAuth } from "../../middlewares/rbac.js";
import { idempotent, idempotencyRequired } from "../../middlewares/idempotency.js";
import { trackingIngestionLimiter } from "../../middlewares/rateLimiter.js";
import { ROLES } from "../../constants/roles.js";

const router = Router();

// --- Ingestion (P2-04, P2-06, P2-07, P2-17, P2-22) — driver/dispatcher only ---
router.post("/location", authenticate, trackingIngestionLimiter, updateLocation);
router.post(
  "/location/bulk",
  authenticate,
  trackingIngestionLimiter,
  idempotencyRequired,
  idempotent,
  updateBulkLocation
);
router.post("/heartbeat", authenticate, trackingIngestionLimiter, heartbeat);
router.post("/sos", authenticate, trackingIngestionLimiter, sos);
router.post(
  "/sos/ack",
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
  sosAck
);
router.post(
  "/occupancy",
  authenticate,
  authorizeRoles(ROLES.CONDUCTOR, ROLES.DRIVER, ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
  trackingIngestionLimiter,
  submitOccupancy
);

// --- Reads (P2-08) — passenger/guest/admin, WS-first, REST is initial hydration ---
router.get("/vehicle/:id", guestOrAuth, getVehicleSnapshot);
router.get("/vehicle/:id/location", guestOrAuth, getLocation);
router.get("/vehicle/:id/status", guestOrAuth, getStatus);
router.get("/vehicle/:id/eta", guestOrAuth, getETA);
router.get("/vehicle/:id/occupancy", guestOrAuth, getOccupancy);
router.get("/route/:id", guestOrAuth, getRouteSnapshot);
router.get("/trip/:id", guestOrAuth, getTripSnapshot);

// --- Trip replay (P2-20) — admin only ---
router.get(
  "/trip/:id/history",
  authenticate,
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DISPATCHER),
  getTripHistory
);

export default router;
