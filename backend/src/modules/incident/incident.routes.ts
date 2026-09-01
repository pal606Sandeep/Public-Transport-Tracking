import { Router } from "express";
import * as c from "./incident.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "incident"));

router.get("/", c.list);
router.post("/", c.create);
router.get("/:id", c.get);
router.patch("/:id", c.update);
router.post("/:id/acknowledge", c.acknowledge);
router.post("/:id/assign", c.assign);
router.post("/:id/resolve", c.resolve);
router.post("/:id/close", c.close);
router.delete("/:id", c.remove);

export default router;
