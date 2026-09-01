import { Router } from "express";
import * as c from "./analytics.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "analytics"));

router.get("/passengers", c.passengers);
router.get("/vehicles", c.vehicles);
router.get("/drivers", c.drivers);
router.get("/routes", c.routes);
router.get("/revenue", c.revenue);

export default router;
