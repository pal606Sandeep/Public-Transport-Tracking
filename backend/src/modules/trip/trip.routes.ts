import { Router } from "express";
import * as c from "./trip.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createTripSchema, assignTripSchema, cancelTripSchema, transitionSchema, scheduleTripCreateSchema } from "./trip.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "trip"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createTripSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.post("/:id/assign", validate(assignTripSchema), c.assign);
adminRouter.post("/:id/transition", validate(transitionSchema), c.transition);
adminRouter.post("/:id/cancel", validate(cancelTripSchema), c.cancel);
adminRouter.post("/:id/miss", c.miss);
adminRouter.post("/:id/complete", c.complete);
adminRouter.post("/bulk-status", validate(scheduleTripCreateSchema), c.bulk);

export { adminRouter as adminTripRouter };
