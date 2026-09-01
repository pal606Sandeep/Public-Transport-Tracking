import { Router } from "express";
import * as c from "./maintenance.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";

const router = Router();
router.use(authenticate, authorize("MANAGE", "maintenance"));

router.post("/run-jobs", c.runJobs);

router.get("/vehicles/:vehicleId/maintenance", c.listMaintenance);
router.post("/vehicles/:vehicleId/maintenance", c.createMaintenance);
router.get("/vehicles/:vehicleId/maintenance/:id", c.getMaintenance);
router.patch("/vehicles/:vehicleId/maintenance/:id", c.updateMaintenance);
router.post("/vehicles/:vehicleId/maintenance/:id/complete", c.completeMaintenance);
router.delete("/vehicles/:vehicleId/maintenance/:id", c.deleteMaintenance);

router.get("/vehicles/:vehicleId/documents", c.listDocuments);
router.post("/vehicles/:vehicleId/documents", c.createDocument);
router.get("/vehicles/:vehicleId/documents/:id", c.getDocument);
router.patch("/vehicles/:vehicleId/documents/:id", c.updateDocument);
router.delete("/vehicles/:vehicleId/documents/:id", c.deleteDocument);

export default router;
