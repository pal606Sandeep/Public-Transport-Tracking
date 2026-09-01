import { Router } from "express";
import { getStaticGtfs } from "./gtfs-static.controller.js";

const router = Router();

router.get("/static.zip", getStaticGtfs);

export default router;