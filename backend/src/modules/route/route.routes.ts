import { Router } from "express";
import * as c from "./route.controller.js";
import { authenticate, authorize, guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createRouteSchema, updateRouteSchema, addStopSchema } from "./route.validation.js";
import { z } from "zod";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "route"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createRouteSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateRouteSchema), c.update);
adminRouter.post("/:id/activate", c.activate);
adminRouter.post("/:id/deactivate", c.deactivate);
adminRouter.post("/:id/stops", validate(addStopSchema), c.addStop);
adminRouter.delete("/:id/stops/:stopId", c.removeStop);
adminRouter.put("/:id/stops/order", validate(z.object({ stopIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)) }).strict()), c.reorder);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminRouteRouter };

// Passenger-facing read (search + details with geometry + ordered stops)
const publicRouter = Router();
publicRouter.use(guestOrAuth);
publicRouter.get("/", c.list);
publicRouter.get("/:id", c.get);

export { publicRouter as publicRouteRouter };
