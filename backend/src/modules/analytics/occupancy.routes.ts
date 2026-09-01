import { Router } from "express";
import * as c from "./occupancy.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "analytics"));

router.get("/occupancy", c.getOccupancy);

export default router;
