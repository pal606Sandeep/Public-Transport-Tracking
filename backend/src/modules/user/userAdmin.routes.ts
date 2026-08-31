import { Router } from "express";
import * as c from "./userAdmin.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { createUserSchema, updateUserSchema } from "./userAdmin.validation.js";

const router = Router();

router.use(authenticate, authorize("MANAGE", "user"));

router.get("/", c.list);
router.post("/", validate(createUserSchema), c.create);
router.get("/:id", c.getById);
router.patch("/:id", validate(updateUserSchema), c.update);
router.post("/:id/deactivate", c.deactivate);
router.post("/:id/activate", c.activate);
router.delete("/:id", c.remove);

export default router;
