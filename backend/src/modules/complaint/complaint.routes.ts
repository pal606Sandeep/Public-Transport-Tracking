import { Router } from "express";
import * as c from "./complaint.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { validate } from "../../utils/validation.js";
import {
  createComplaintSchema,
  listComplaintQuery,
  assignComplaintSchema,
  updateComplaintSchema,
  escalateComplaintSchema,
  resolveComplaintSchema,
  closeComplaintSchema,
  attachmentSchema,
  feedbackSchema,
} from "./complaint.validation.js";

// P1-39 — passenger-facing complaints. Guests cannot create.
const complaintRouter = Router();
complaintRouter.use(authenticate);

complaintRouter.post("/", denyGuest, validate(createComplaintSchema), c.create);
complaintRouter.get("/", denyGuest, validate(listComplaintQuery, "query"), c.listMine);
complaintRouter.get("/:id", c.getOne);
complaintRouter.get("/:id/history", c.history);
complaintRouter.post("/:id/attachments", denyGuest, validate(attachmentSchema), c.addAttachment);
complaintRouter.post("/:id/feedback", denyGuest, validate(feedbackSchema), c.submitFeedback);

// Staff / admin queue management.
const adminComplaintRouter = Router();
adminComplaintRouter.use(authenticate, authorize("MANAGE", "complaint"));
adminComplaintRouter.get("/", validate(listComplaintQuery, "query"), c.listAll);
adminComplaintRouter.get("/:id", c.getOne);
adminComplaintRouter.get("/:id/history", c.history);
adminComplaintRouter.post("/:id/assign", validate(assignComplaintSchema), c.assign);
adminComplaintRouter.patch("/:id", validate(updateComplaintSchema), c.update);
adminComplaintRouter.post("/:id/escalate", validate(escalateComplaintSchema), c.escalate);
adminComplaintRouter.post("/:id/resolve", validate(resolveComplaintSchema), c.resolve);
adminComplaintRouter.post("/:id/close", validate(closeComplaintSchema), c.close);

export { complaintRouter, adminComplaintRouter };
