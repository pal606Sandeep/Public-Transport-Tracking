import { Router } from "express";
import * as c from "./schedule.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createScheduleSchema, updateScheduleSchema, generateScheduleSchema } from "./schedule.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "schedule"));

adminRouter.get("/", c.list);
adminRouter.post("/", validate(createScheduleSchema), c.create);
adminRouter.get("/:id", c.get);
adminRouter.patch("/:id", validate(updateScheduleSchema), c.update);
adminRouter.post("/:id/generate", validate(generateScheduleSchema), c.generate);
adminRouter.delete("/:id", c.remove);

export { adminRouter as adminScheduleRouter };
