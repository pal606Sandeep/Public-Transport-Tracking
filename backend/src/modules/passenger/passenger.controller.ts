import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./passenger.service.js";

const uid = (req: Request): string => req.user!.id;

export const getMyProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await svc.getOrCreateProfile(uid(req));
  apiResponse(res, 200, true, "Passenger profile", { passenger: profile });
});

export const updateMyPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await svc.updatePreferences(uid(req), req.body as never);
  apiResponse(res, 200, true, "Preferences updated", { passenger: profile });
});

export const listFavourites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const favourites = await svc.listFavourites(uid(req));
  apiResponse(res, 200, true, "Favourites", favourites);
});

export const addFavourite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { type: "route" | "stop"; targetId: string };
  const favourites = await svc.addFavourite(uid(req), body.type, body.targetId);
  apiResponse(res, 201, true, "Favourite added", favourites);
});

export const removeFavourite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const type = (req.query as { type?: string }).type as "route" | "stop" | undefined;
  if (type !== "route" && type !== "stop") {
    apiResponse(res, 400, false, "type query must be 'route' or 'stop'");
    return;
  }
  const favourites = await svc.removeFavourite(uid(req), type, (req.params as { id: string }).id);
  apiResponse(res, 200, true, "Favourite removed", favourites);
});

export const listSavedLocations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const locations = await svc.listSavedLocations(uid(req));
  apiResponse(res, 200, true, "Saved locations", { locations });
});

export const createSavedLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const location = await svc.createSavedLocation(uid(req), req.body as never);
  apiResponse(res, 201, true, "Saved location created", { location });
});

export const updateSavedLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const location = await svc.updateSavedLocation(
    uid(req),
    (req.params as { id: string }).id,
    req.body as never
  );
  apiResponse(res, 200, true, "Saved location updated", { location });
});

export const deleteSavedLocation = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await svc.deleteSavedLocation(uid(req), (req.params as { id: string }).id);
  apiResponse(res, 200, true, "Saved location deleted");
});

export const listRecentSearches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const searches = await svc.listRecentSearches(uid(req));
  apiResponse(res, 200, true, "Recent searches", { searches });
});

export const createRecentSearch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const searches = await svc.createRecentSearch(uid(req), req.body as never);
  apiResponse(res, 201, true, "Search recorded", { searches });
});

export const deleteRecentSearch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await svc.deleteRecentSearch(uid(req), (req.params as { id: string }).id);
  apiResponse(res, 200, true, "Search removed");
});

export const clearRecentSearches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await svc.clearRecentSearches(uid(req));
  apiResponse(res, 200, true, "Recent searches cleared");
});

/* ---------------------- admin ---------------------------------------- */

export const blockPassenger = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const reason = (req.body as { reason?: string })?.reason;
  const profile = await svc.blockPassenger((req.params as { userId: string }).userId, reason);
  apiResponse(res, 200, true, "Passenger blocked", { passenger: profile });
});

export const unblockPassenger = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await svc.unblockPassenger((req.params as { userId: string }).userId);
  apiResponse(res, 200, true, "Passenger unblocked", { passenger: profile });
});
