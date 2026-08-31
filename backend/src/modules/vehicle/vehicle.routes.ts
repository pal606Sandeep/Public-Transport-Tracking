import { Router } from "express";
import * as c from "./vehicle.controller.js";
import { authenticate, authorize, guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createVehicleSchema, updateVehicleSchema, assignVehicleSchema } from "./vehicle.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "vehicle"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createVehicleSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateVehicleSchema), c.update);
adminRouter.post("/:id/assign", validate(assignVehicleSchema), c.assign);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminVehicleRouter };

// Passenger-facing read (authenticated user or guest) — accessibility + amenities
const publicRouter = Router();
publicRouter.use(guestOrAuth);
publicRouter.get("/:id", c.getPublic);

export { publicRouter as publicVehicleRouter };
