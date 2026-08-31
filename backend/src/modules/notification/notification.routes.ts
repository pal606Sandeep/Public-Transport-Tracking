import { Router } from "express";
import * as c from "./notification.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  listQuery,
  setReadSchema,
  updatePreferencesSchema,
  pushSubscriptionSchema,
  removePushSchema,
  templateSchema,
  renderPreviewSchema,
} from "./notification.validation.js";

// P1-36 — user-facing notification centre.
const router = Router();
router.use(authenticate);

router.get("/", validate(listQuery, "query"), c.list);
router.get("/preferences", c.getPreferences);
router.put("/preferences", validate(updatePreferencesSchema), c.updatePreferences);
router.post("/read-all", c.readAll);
router.post("/push-subscriptions", validate(pushSubscriptionSchema), c.registerPush);
router.delete("/push-subscriptions", validate(removePushSchema), c.removePush);
router.get("/:id", c.get);
router.patch("/:id/read", validate(setReadSchema), c.setRead);

export default router;

// P1-36 — admin template management.
export const adminNotificationRouter = Router();
adminNotificationRouter.use(authenticate, authorize("MANAGE", "notification"));
adminNotificationRouter.get("/", c.listTemplates);
adminNotificationRouter.post("/", validate(templateSchema), c.upsertTemplate);
adminNotificationRouter.post("/preview", validate(renderPreviewSchema), c.previewTemplate);
adminNotificationRouter.delete("/:key", c.deleteTemplate);
