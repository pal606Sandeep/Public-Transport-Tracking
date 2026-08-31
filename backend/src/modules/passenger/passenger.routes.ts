import { Router } from "express";
import * as c from "./passenger.controller.js";
import { authenticate, authorize } from "../../middlewares/rbac.js";
import { denyGuest } from "../../middlewares/denyGuest.js";
import { validate } from "../../utils/validation.js";
import {
  updatePreferencesSchema,
  addFavouriteSchema,
  createSavedLocationSchema,
  updateSavedLocationSchema,
  createRecentSearchSchema,
  blockPassengerSchema,
  addSubscriptionSchema,
} from "./passenger.validation.js";

const router = Router();

router.use(authenticate);

router.get("/me", c.getMyProfile);
router.patch("/me", validate(updatePreferencesSchema), c.updateMyPreferences);

router.get("/me/favourites", c.listFavourites);
router.post("/me/favourites", validate(addFavouriteSchema), c.addFavourite);
router.delete("/me/favourites/:id", c.removeFavourite);

router.get("/me/saved-locations", c.listSavedLocations);
router.post("/me/saved-locations", validate(createSavedLocationSchema), c.createSavedLocation);
router.patch("/me/saved-locations/:id", validate(updateSavedLocationSchema), c.updateSavedLocation);
router.delete("/me/saved-locations/:id", c.deleteSavedLocation);

router.get("/me/subscriptions", denyGuest, c.listSubscriptions);
router.post("/me/subscriptions", denyGuest, validate(addSubscriptionSchema), c.addSubscription);
router.delete("/me/subscriptions/:id", denyGuest, c.removeSubscription);

router.get("/me/recent-searches", c.listRecentSearches);
router.post("/me/recent-searches", validate(createRecentSearchSchema), c.createRecentSearch);
router.delete("/me/recent-searches", c.clearRecentSearches);
router.delete("/me/recent-searches/:id", c.deleteRecentSearch);

export default router;

export const adminPassengerRouter = Router();
adminPassengerRouter.use(authenticate, authorize("MANAGE", "passenger"));
adminPassengerRouter.post("/:userId/block", validate(blockPassengerSchema), c.blockPassenger);
adminPassengerRouter.post("/:userId/unblock", c.unblockPassenger);
