import { Router } from "express";
import * as c from "./systemSetting.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  listSystemSettingsSchema,
  createSystemSettingSchema,
  updateSystemSettingSchema,
  bulkUpsertSystemSettingsSchema,
} from "./systemSetting.validation.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "system_settings"));

router.get("/", validate(listSystemSettingsSchema, "query"), c.list);
router.post("/", validate(createSystemSettingSchema), c.create);
router.put("/bulk", validate(bulkUpsertSystemSettingsSchema), c.bulkUpsert);
router.get("/:key", c.get);
router.patch("/:key", validate(updateSystemSettingSchema), c.update);
router.delete("/:key", c.remove);

export default router;