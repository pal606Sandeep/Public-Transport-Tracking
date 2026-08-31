import { Router } from "express";
import * as c from "./serviceAlert.controller.js";
import { authenticate, authorize, guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createServiceAlertSchema, updateServiceAlertSchema } from "./serviceAlert.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "serviceAlert"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createServiceAlertSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateServiceAlertSchema), c.update);
adminRouter.post("/:id/publish", c.publish);
adminRouter.post("/:id/cancel", c.cancel);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminServiceAlertRouter };

// Passenger-facing read: alerts filtered to currently PUBLISHED + active window.
const publicRouter = Router();
publicRouter.use(guestOrAuth);
publicRouter.get("/", c.publicList);

export { publicRouter as publicServiceAlertRouter };
