import { Router } from "express";
import * as c from "./conductor.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  createConductorSchema,
  updateConductorSchema,
  assignConductorSchema,
  setConductorStatusSchema,
  recordConductorAttendanceSchema,
} from "./conductor.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "conductor"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createConductorSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateConductorSchema), c.update);
adminRouter.post("/:id/assign", validate(assignConductorSchema), c.assign);
adminRouter.post("/:id/status", validate(setConductorStatusSchema), c.status);
adminRouter.post("/:id/attendance", validate(recordConductorAttendanceSchema), c.attendance);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminConductorRouter };
