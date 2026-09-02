import { Router } from "express";
import * as c from "./payment.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { idempotent, idempotencyRequired } from "../../middlewares/idempotency.js";
import { validate } from "../../utils/validation.js";
import { createPaymentSchema, webhookSchema, refundPaymentSchema, createQrSchema } from "./payment.validation.js";

// Gateway-facing webhook — no auth (server-to-server). Signed verification is
// noted for the production gateway (P1-44 scope: webhook idempotency).
const webhookRouter = Router();
webhookRouter.post("/:provider", validate(webhookSchema), c.webhook);

const router = Router();
router.use(authenticate, denyGuest);

router.post("/", idempotencyRequired, idempotent, validate(createPaymentSchema), c.create);
router.post("/qr", validate(createQrSchema), c.qr);
router.get("/", c.list);
router.get("/:id", c.get);

export default router;

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "payment"));
adminRouter.get("/", c.adminList);
adminRouter.get("/:id", c.adminGet);
adminRouter.post("/:id/refund", validate(refundPaymentSchema), c.refund);

export { adminRouter as adminPaymentRouter, webhookRouter };
