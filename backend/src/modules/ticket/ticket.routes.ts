import { Router } from "express";
import * as c from "./ticket.controller.js";
import { authenticate } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { idempotent, idempotencyRequired } from "../../middlewares/idempotency.js";
import { validate } from "../../utils/validation.js";
import {
  createTicketSchema,
  validateTicketSchema,
  cancelTicketSchema,
  purchasePassSchema,
  bulkTicketsSchema,
} from "./ticket.validation.js";

const router = Router();
router.use(authenticate, denyGuest);

router.get("/", c.list);
router.post("/", idempotencyRequired, idempotent, validate(createTicketSchema), c.create);

// conductor offline bulk (P1-46) — declared before /:id so it matches first
router.post("/bulk", validate(bulkTicketsSchema), c.createBulk);

// passes (declared before /:id so they match first)
router.get("/passes", c.listPasses);
router.post("/passes/purchase", idempotencyRequired, idempotent, validate(purchasePassSchema), c.purchasePass);
router.get("/passes/active", c.activePass);

router.post("/validate", validate(validateTicketSchema), c.validateByCode);
router.get("/:id", c.get);
router.post("/:id/validate", validate(validateTicketSchema), c.validateTicket);
router.post("/:id/cancel", validate(cancelTicketSchema), c.cancel);

export default router;
