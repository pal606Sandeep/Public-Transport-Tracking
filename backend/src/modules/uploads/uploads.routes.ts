import { Router, raw } from "express";
import * as c from "./uploads.controller.js";
import { authenticate } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import { presignSchema, confirmSchema } from "./uploads.validation.js";

const router = Router();

router.post("/presign", authenticate, validate(presignSchema), c.presign);
router.put("/:key", raw({ type: () => true, limit: "60mb" }), c.put);
router.post("/confirm", authenticate, validate(confirmSchema), c.confirm);

export default router;
