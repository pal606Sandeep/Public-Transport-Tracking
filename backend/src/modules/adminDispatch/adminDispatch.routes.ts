import { Router } from "express";
import * as c from "./adminDispatch.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { dispatchMessageSchema, tripForceEndSchema } from "./adminDispatch.validation.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "dispatch"));

router.post("/messages", validate(dispatchMessageSchema), c.sendMessage);
router.get("/messages", c.listMessages);
router.post("/trips/:id/force-end-broadcast", validate(tripForceEndSchema), c.tripForceEndBroadcast);

export default router;