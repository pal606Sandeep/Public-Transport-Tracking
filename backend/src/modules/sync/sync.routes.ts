import { Router } from "express";
import * as c from "./sync.controller.js";
import { guestOrAuth } from "../../middlewares/rbac.js";

const router = Router();
router.use(guestOrAuth);

router.get("/routes", c.routes);
router.get("/stops", c.stops);
router.get("/schedules", c.schedules);
router.get("/fares", c.fares);

export default router;
