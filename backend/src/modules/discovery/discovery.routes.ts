import { Router } from "express";
import * as c from "./discovery.controller.js";
import { guestOrAuth } from "../../middlewares/rbac.js";
import { validate } from "../../utils/validation.js";
import {
  routeSearchQuery,
  stopSearchQuery,
  findBusQuery,
  journeyQuery,
} from "./discovery.validation.js";

// P1-33 — search routes / stops + find bus (source → destination). Public read,
// guest tokens allowed.
const discoveryRouter = Router();
discoveryRouter.use(guestOrAuth);
discoveryRouter.get("/routes", validate(routeSearchQuery, "query"), c.routeSearch);
discoveryRouter.get("/stops", validate(stopSearchQuery, "query"), c.stopSearch);
discoveryRouter.get("/find-bus", validate(findBusQuery, "query"), c.findBus);

// P1-34 — journey planner, mounted at /api/v1/journeys.
const journeyRouter = Router();
journeyRouter.use(guestOrAuth);
journeyRouter.get("/", validate(journeyQuery, "query"), c.planJourney);

export { discoveryRouter, journeyRouter };
