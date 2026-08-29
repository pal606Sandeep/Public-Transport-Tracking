import { Router } from "express";
import * as c from "./rbac.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { rolePermissionsSchema, createRoleSchema } from "./rbac.validation.js";

const router = Router();

router.use(authenticate, authorize("MANAGE", "role"));

router.get("/permissions", c.listPermissions);
router.get("/roles", c.listRoles);
router.get("/roles/:code", c.getRole);
router.put("/roles/:code/permissions", validate(rolePermissionsSchema), c.updateRolePermissions);
router.post("/roles", validate(createRoleSchema), c.createRole);
router.delete("/roles/:code", c.deleteRole);

export default router;
