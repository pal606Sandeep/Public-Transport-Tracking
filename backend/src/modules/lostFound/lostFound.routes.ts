import { Router } from "express";
import * as c from "./lostFound.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { validate } from "../../utils/validation.js";
import {
  createLostFoundSchema,
  listLostFoundQuery,
  matchQuery,
  assignLostFoundSchema,
  updateLostFoundSchema,
  confirmReturnSchema,
  closeLostFoundSchema,
} from "./lostFound.validation.js";

// P1-40 — reporter-facing.
const lostFoundRouter = Router();
lostFoundRouter.use(authenticate, denyGuest);
lostFoundRouter.post("/", validate(createLostFoundSchema), c.create);
lostFoundRouter.get("/", validate(listLostFoundQuery, "query"), c.listMine);
lostFoundRouter.get("/:id", c.getOne);

// Staff / admin — matching, assignment, return confirmation, closure.
const adminLostFoundRouter = Router();
adminLostFoundRouter.use(authenticate, authorize("MANAGE", "lostFound"));
adminLostFoundRouter.get("/", validate(listLostFoundQuery, "query"), c.listAll);
adminLostFoundRouter.get("/:id", c.getOne);
adminLostFoundRouter.get("/:id/matches", validate(matchQuery, "query"), c.matches);
adminLostFoundRouter.post("/:id/assign", validate(assignLostFoundSchema), c.assign);
adminLostFoundRouter.patch("/:id", validate(updateLostFoundSchema), c.update);
adminLostFoundRouter.post("/:id/confirm-return", validate(confirmReturnSchema), c.confirmReturn);
adminLostFoundRouter.post("/:id/close", validate(closeLostFoundSchema), c.close);

export { lostFoundRouter, adminLostFoundRouter };
