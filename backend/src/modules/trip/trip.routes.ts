import { Router } from "express";
import * as c from "./trip.controller.js";
import { authenticate, authorize, authorizeRoles } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  createTripSchema,
  assignTripSchema,
  cancelTripSchema,
  transitionSchema,
  scheduleTripCreateSchema,
  tripActionSchema,
  checklistSchema,
} from "./trip.validation.js";
import { ROLES } from "../../constants/roles.js";
import { idempotencyRequired, idempotent } from "../../middlewares/idempotency.js";

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
adminRouter.post("/:id/force-end", c.forceEnd);
adminRouter.post("/bulk-status", validate(scheduleTripCreateSchema), c.bulk);

const staffRouter = Router();
staffRouter.use(authenticate, authorizeRoles(ROLES.DRIVER, ROLES.CONDUCTOR));

staffRouter.get("/:id/resume-state", c.getMyActiveTripResumeState);

// P1-28 — pause/resume/end. Contract: PATCH /:id { action } with a mandatory
// Idempotency-Key. The /resume and /end sub-routes are kept as explicit
// aliases; all three replay the stored response on a repeated key.
staffRouter.patch("/:id", idempotencyRequired, idempotent, validate(tripActionSchema), c.action);
staffRouter.patch("/:id/resume", idempotencyRequired, idempotent, c.resume);
staffRouter.patch("/:id/end", idempotencyRequired, idempotent, c.end);

// P1-29 — start an existing assigned trip.
staffRouter.post("/:id/start", idempotencyRequired, idempotent, c.start);
staffRouter.post("/:id/checklist", validate(checklistSchema), c.checklist);
staffRouter.get("/:id/checklist-block", c.getChecklistBlock);

export { adminRouter, staffRouter };
