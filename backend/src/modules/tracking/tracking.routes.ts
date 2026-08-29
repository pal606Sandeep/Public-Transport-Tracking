import { Router } from "express";
import { updateLocation, getLocation } from "./tracking.controller.js";

const router = Router();

router.post("/:vehicleId/location", updateLocation);
router.get("/:vehicleId/location", getLocation);

export default router;