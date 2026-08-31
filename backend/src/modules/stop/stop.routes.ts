import { Router } from "express";
import * as c from "./stop.controller.js";
import { authenticate, authorize, guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createStopSchema, updateStopSchema } from "./stop.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "stop"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createStopSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateStopSchema), c.update);
adminRouter.post("/:id/deactivate", c.deactivate);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminStopRouter };

// Passenger-facing read (search + nearest-stop)
const publicRouter = Router();
publicRouter.use(guestOrAuth);
publicRouter.get("/", c.list);
publicRouter.get("/:id", c.get);

export { publicRouter as publicStopRouter };
