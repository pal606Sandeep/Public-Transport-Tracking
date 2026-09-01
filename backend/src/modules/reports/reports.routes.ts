import { Router } from "express";
import * as c from "./reports.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "reports"));

router.get("/:type", c.jsonReport);
router.get("/:type/export.csv", c.csvReport);
router.get("/:type/export.pdf", c.pdfReport);

export default router;
