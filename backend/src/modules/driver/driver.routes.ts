import { Router } from "express";
import * as c from "./driver.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  createDriverSchema,
  updateDriverSchema,
  assignDriverSchema,
  setDriverStatusSchema,
  recordAttendanceSchema,
} from "./driver.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "driver"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createDriverSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateDriverSchema), c.update);
adminRouter.post("/:id/assign", validate(assignDriverSchema), c.assign);
adminRouter.post("/:id/status", validate(setDriverStatusSchema), c.status);
adminRouter.post("/:id/attendance", validate(recordAttendanceSchema), c.attendance);
adminRouter.delete("/:id", c.remove);
adminRouter.get("/:id/performance", c.adminPerformance);

export { adminRouter as adminDriverRouter };

const userRouter = Router();
userRouter.use(authenticate);
userRouter.get("/me/performance", c.myPerformance);

export { userRouter as driverUserRouter };
