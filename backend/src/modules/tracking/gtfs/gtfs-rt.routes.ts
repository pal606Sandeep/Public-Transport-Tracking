import { Router, Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildVehiclePositionsFeed, buildTripUpdatesFeed, buildAlertsFeed } from "./gtfs-rt.service.js";

const router = Router();

const PROTOBUF_CONTENT_TYPE = "application/x-protobuf";

router.get(
  "/vehicle-positions",
  asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await buildVehiclePositionsFeed();
    res.set("Content-Type", PROTOBUF_CONTENT_TYPE);
    res.send(buffer);
  })
);

router.get(
  "/trip-updates",
  asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await buildTripUpdatesFeed();
    res.set("Content-Type", PROTOBUF_CONTENT_TYPE);
    res.send(buffer);
  })
);

router.get(
  "/alerts",
  asyncHandler(async (_req: Request, res: Response) => {
    const buffer = await buildAlertsFeed();
    res.set("Content-Type", PROTOBUF_CONTENT_TYPE);
    res.send(buffer);
  })
);

export default router;
