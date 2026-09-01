import { Router } from "express";
import * as c from "./tripSync.controller.js";
import { authenticate } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { validate } from "../../utils/validation.js";
import { passengerCountBulkSchema, reconciliationSchema } from "./trip.validation.js";

const syncRouter = Router();
syncRouter.use(authenticate, denyGuest);

// Conductor offline sync (P1-46). Declared on their own router mounted before
// the role-restricted trips staffRouter so any authenticated (non-guest) user
// can drive them from an offline device.
syncRouter.post("/:id/passenger-count/bulk", validate(passengerCountBulkSchema), c.passengerCountBulk);
syncRouter.post("/:id/reconciliation", validate(reconciliationSchema), c.reconcile);

export default syncRouter;
