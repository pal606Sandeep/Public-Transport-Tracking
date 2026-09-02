import { Router } from "express";
import * as c from "./fare.controller.js";
import { authenticate, authorize, guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  createFareSchema,
  updateFareSchema,
  createFareRuleSchema,
  updateFareRuleSchema,
  createConcessionSchema,
  updateConcessionSchema,
  createPassSchema,
  updatePassSchema,
  calculateFareSchema,
} from "./fare.validation.js";

const adminRouter = Router();
adminRouter.use(authenticate, authorize("MANAGE", "fare"));

// Fares
adminRouter.get("/", c.listFares);
adminRouter.post("/", validate(createFareSchema), c.createFare);

// Fare rules (declared before /:id so they match first)
adminRouter.get("/rules", c.listFareRules);
adminRouter.post("/rules", validate(createFareRuleSchema), c.createFareRule);
adminRouter.get("/rules/:id", c.getFareRule);
adminRouter.patch("/rules/:id", validate(updateFareRuleSchema), c.updateFareRule);
adminRouter.delete("/rules/:id", c.removeFareRule);

// Concessions
adminRouter.get("/concessions", c.listConcessions);
adminRouter.post("/concessions", validate(createConcessionSchema), c.createConcession);
adminRouter.get("/concessions/:id", c.getConcession);
adminRouter.patch("/concessions/:id", validate(updateConcessionSchema), c.updateConcession);
adminRouter.delete("/concessions/:id", c.removeConcession);

// Passes
adminRouter.get("/passes", c.listPasses);
adminRouter.post("/passes", validate(createPassSchema), c.createPass);
adminRouter.get("/passes/:id", c.getPass);
adminRouter.patch("/passes/:id", validate(updatePassSchema), c.updatePass);
adminRouter.delete("/passes/:id", c.removePass);

// Fares by :id (declared last so /rules|/concessions|/passes match first)
adminRouter.get("/:id", c.getFare);
adminRouter.patch("/:id", validate(updateFareSchema), c.updateFare);
adminRouter.delete("/:id", c.removeFare);

export { adminRouter as adminFareRouter };

/* Public passenger-facing fare calculation (P1-42). */
const publicRouter = Router();
publicRouter.use(guestOrAuth);
publicRouter.post("/calculate", validate(calculateFareSchema), c.calculateFare);

// Read-only catalog the PWA needs to render buyable passes and concession
// discounts. Only active items are returned.
publicRouter.get("/passes", c.listPublicPasses);
publicRouter.get("/concessions", c.listPublicConcessions);

export { publicRouter as publicFareRouter };
