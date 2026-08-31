import { Types } from "mongoose";
import { Passenger } from "./passenger.model.js";
import { SavedLocation } from "./savedLocation.model.js";
import { RecentSearch, RECENT_SEARCH_CAP } from "./recentSearch.model.js";
import { AppError } from "../../utils/AppError.js";

export const getOrCreateProfile = async (userId: string): Promise<unknown> => {
  let passenger = await Passenger.findOne({ userId }).lean();
  if (!passenger) {
    await Passenger.create({ userId });
    passenger = await Passenger.findOne({ userId }).lean();
  }
  return serializeProfile(passenger!);
};

export const getProfile = async (userId: string): Promise<unknown> => {
  const passenger = await Passenger.findOne({ userId }).lean();
  if (!passenger) throw AppError.notFound("Passenger profile not found", "PASSENGER_NOT_FOUND");
  return serializeProfile(passenger);
};

export const updatePreferences = async (
  userId: string,
  prefs: {
    language?: string;
    theme?: string;
    seatPreference?: string | null;
    notifications?: { serviceAlerts?: boolean; favourites?: boolean; promotions?: boolean };
  }
): Promise<unknown> => {
  const passenger = await getPassengerDoc(userId);
  if (prefs.language !== undefined) passenger.preferences.language = prefs.language;
  if (prefs.theme !== undefined) passenger.preferences.theme = prefs.theme as never;
  if (prefs.seatPreference !== undefined) passenger.preferences.seatPreference = prefs.seatPreference as never;
  if (prefs.notifications) {
    const notif =
      passenger.preferences.notifications ?? { serviceAlerts: true, favourites: true, promotions: false };
    passenger.preferences.notifications = notif;
    for (const key of ["serviceAlerts", "favourites", "promotions"] as const) {
      const v = prefs.notifications[key];
      if (v !== undefined) notif[key] = v;
    }
  }
  await passenger.save();
  return serializeProfile(passenger.toObject());
};

export const addFavourite = async (
  userId: string,
  type: "route" | "stop",
  targetId: string
): Promise<unknown> => {
  const oid = new Types.ObjectId(targetId);
  const field = type === "route" ? "favouriteRouteIds" : "favouriteStopIds";
  await Passenger.updateOne(
    { userId },
    { $addToSet: { [field]: oid } },
    { upsert: true }
  );
  return listFavourites(userId);
};

export const listFavourites = async (userId: string): Promise<unknown> => {
  const passenger = await Passenger.findOne({ userId }).lean();
  return {
    routes: passenger?.favouriteRouteIds ?? [],
    stops: passenger?.favouriteStopIds ?? [],
  };
};

export const removeFavourite = async (
  userId: string,
  type: "route" | "stop",
  targetId: string
): Promise<unknown> => {
  const oid = new Types.ObjectId(targetId);
  const field = type === "route" ? "favouriteRouteIds" : "favouriteStopIds";
  await Passenger.updateOne({ userId }, { $pull: { [field]: oid } });
  return listFavourites(userId);
};

/* ---------------------- saved locations ----------------------------- */

export const listSavedLocations = async (userId: string): Promise<unknown[]> => {
  const docs = await SavedLocation.find({ userId }).sort({ createdAt: 1 }).lean();
  return docs.map(serializeLocation);
};

export const createSavedLocation = async (
  userId: string,
  input: {
    name: string;
    location: { lng: number; lat: number };
    address?: string | null;
    isHome?: boolean;
    isWork?: boolean;
  }
): Promise<unknown> => {
  const doc = await SavedLocation.create({
    userId,
    name: input.name,
    location: { type: "Point", coordinates: [input.location.lng, input.location.lat] },
    address: input.address ?? null,
    isHome: input.isHome ?? false,
    isWork: input.isWork ?? false,
  });
  return serializeLocation(doc.toObject());
};

export const updateSavedLocation = async (
  userId: string,
  id: string,
  input: {
    name?: string;
    location?: { lng: number; lat: number };
    address?: string | null;
    isHome?: boolean;
    isWork?: boolean;
  }
): Promise<unknown> => {
  const doc = await SavedLocation.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound("Saved location not found", "LOCATION_NOT_FOUND");
  if (input.name !== undefined) doc.name = input.name;
  if (input.address !== undefined) doc.address = input.address;
  if (input.isHome !== undefined) doc.isHome = input.isHome;
  if (input.isWork !== undefined) doc.isWork = input.isWork;
  if (input.location) {
    doc.location = { type: "Point", coordinates: [input.location.lng, input.location.lat] };
  }
  await doc.save();
  return serializeLocation(doc.toObject());
};

export const deleteSavedLocation = async (userId: string, id: string): Promise<void> => {
  const res = await SavedLocation.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw AppError.notFound("Saved location not found", "LOCATION_NOT_FOUND");
};

/* ---------------------- recent searches ----------------------------- */

export const listRecentSearches = async (userId: string): Promise<unknown[]> => {
  const docs = await RecentSearch.find({ userId }).sort({ createdAt: -1 }).limit(RECENT_SEARCH_CAP).lean();
  return docs.map(serializeRecentSearch);
};

export const createRecentSearch = async (
  userId: string,
  input: {
    type: "route" | "stop" | "place" | "journey";
    term?: string | null;
    targetId?: string;
    location?: { lng: number; lat: number };
    results?: number;
  }
): Promise<unknown> => {
  // Dedupe key: term > targetId > location coords, so distinct entries stay distinct.
  let key: Record<string, unknown> = { userId, type: input.type };
  if (input.term) key = { ...key, term: input.term };
  else if (input.targetId) key = { ...key, targetId: new Types.ObjectId(input.targetId) };
  else if (input.location) key = { ...key, "location.coordinates": [input.location.lng, input.location.lat] };

  // Bump existing matching entry to the top instead of duplicating.
  const existing = await RecentSearch.findOneAndUpdate(
    key,
    { $set: { updatedAt: new Date(), results: input.results ?? 0 } },
    { new: true }
  );
  if (!existing) {
    await RecentSearch.create({
      userId,
      type: input.type,
      term: input.term ?? null,
      targetId: input.targetId ? new Types.ObjectId(input.targetId) : null,
      location: input.location
        ? { type: "Point", coordinates: [input.location.lng, input.location.lat] }
        : null,
      results: input.results ?? 0,
    });
  }

  // Enforce cap (newest first).
  const excess = (await RecentSearch.countDocuments({ userId })) - RECENT_SEARCH_CAP;
  if (excess > 0) {
    const toTrim = await RecentSearch.find({ userId })
      .sort({ createdAt: 1 })
      .limit(excess)
      .select("_id")
      .lean();
    await RecentSearch.deleteMany({ _id: { $in: toTrim.map((d) => d._id) } });
  }

  return listRecentSearches(userId);
};

export const deleteRecentSearch = async (userId: string, id: string): Promise<void> => {
  const res = await RecentSearch.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw AppError.notFound("Recent search not found", "SEARCH_NOT_FOUND");
};

export const clearRecentSearches = async (userId: string): Promise<void> => {
  await RecentSearch.deleteMany({ userId });
};

/* ---------------------- admin block / unblock ----------------------- */

export const blockPassenger = async (userId: string, reason?: string): Promise<unknown> => {
  const doc = await getPassengerDoc(userId);
  doc.blocked = true;
  doc.blockedReason = reason ?? null;
  doc.blockedAt = new Date();
  await doc.save();
  return serializeProfile(doc.toObject());
};

export const unblockPassenger = async (userId: string): Promise<unknown> => {
  const doc = await getPassengerDoc(userId);
  doc.blocked = false;
  doc.blockedReason = null;
  doc.blockedAt = null;
  await doc.save();
  return serializeProfile(doc.toObject());
};

export const assertNotBlocked = async (userId: string): Promise<void> => {
  const passenger = await Passenger.findOne({ userId }).lean();
  if (passenger?.blocked) {
    throw AppError.forbidden("Passenger is blocked", "PASSENGER_BLOCKED");
  }
};

const getPassengerDoc = async (userId: string) => {
  let doc = await Passenger.findOne({ userId });
  if (!doc) {
    doc = await Passenger.create({ userId });
  }
  return doc;
};

/* ---------------------- serializers --------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeProfile = (p: any): Record<string, unknown> => ({
  _id: p._id?.toString?.() ?? p._id,
  userId: p.userId?.toString?.() ?? p.userId,
  preferences: p.preferences ?? {},
  favouriteRouteIds: (p.favouriteRouteIds ?? []).map((id: Types.ObjectId) => id.toString()),
  favouriteStopIds: (p.favouriteStopIds ?? []).map((id: Types.ObjectId) => id.toString()),
  blocked: p.blocked,
  blockedReason: p.blockedReason ?? null,
  blockedAt: p.blockedAt ?? null,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeLocation = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  location: d.location
    ? { lng: d.location.coordinates[0], lat: d.location.coordinates[1] }
    : null,
  address: d.address ?? null,
  isHome: d.isHome ?? false,
  isWork: d.isWork ?? false,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeRecentSearch = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  type: d.type,
  term: d.term ?? null,
  targetId: d.targetId?.toString?.() ?? null,
  location: d.location?.coordinates
    ? { lng: d.location.coordinates[0], lat: d.location.coordinates[1] }
    : null,
  results: d.results ?? 0,
  createdAt: d.createdAt,
});
