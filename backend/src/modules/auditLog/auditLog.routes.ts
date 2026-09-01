import { Router } from "express";
import * as c from "./auditLog.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "audit"));

router.get("/", c.list);
router.get("/:id", c.get);

export default router;