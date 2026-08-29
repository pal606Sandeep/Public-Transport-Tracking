import { Router } from "express";
import {
  updateLocation,
  getLocation,
  getStatus,
  getETA,
  getOccupancy,
} from "./tracking.controller.js";

const router = Router();

router.post("/:vehicleId/location", updateLocation);
router.get("/:vehicleId/location", getLocation);
router.get("/:vehicleId/status", getStatus);
router.get("/:vehicleId/eta", getETA);
router.get("/:vehicleId/occupancy", getOccupancy);

export default router;