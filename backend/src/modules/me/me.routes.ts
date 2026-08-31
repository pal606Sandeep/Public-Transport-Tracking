import { Router } from "express";
import * as c from "./me.controller.js";
import { authenticate, authorizeRoles } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { requestAssignmentSchema, decideRequestSchema, checkinSchema } from "./me.validation.js";
import { ROLES } from "../../constants/roles.js";

const staff = [ROLES.DRIVER, ROLES.CONDUCTOR] as string[];

const meRouter = Router();
meRouter.use(authenticate);

meRouter.get("/assignments", authorizeRoles(...staff), c.myAssignments);
meRouter.post("/assignments/request", authorizeRoles(...staff), validate(requestAssignmentSchema), c.myRequestAssignment);
meRouter.post("/attendance/check-in", authorizeRoles(...staff), validate(checkinSchema), c.myCheckIn);
meRouter.post("/attendance/check-out", authorizeRoles(...staff), validate(checkinSchema), c.myCheckOut);

const adminRequestRouter = Router();
adminRequestRouter.use(
  authenticate,
  authorizeRoles(ROLES.DISPATCHER, ROLES.TRANSPORT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
);

adminRequestRouter.get("/", c.listAssignmentRequests);
adminRequestRouter.patch("/:id/decision", validate(decideRequestSchema), c.decideAssignmentRequest);

export { meRouter, adminRequestRouter };
