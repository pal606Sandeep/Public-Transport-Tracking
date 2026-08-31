import { api } from "@/utils/apiClient";
import type {
  PassengerProfile,
  PreferencesPatch,
  Favourites,
  FavouriteType,
  SavedLocation,
  SavedLocationInput,
} from "../constant/passenger.types";

const BASE = "/passengers/me";

/* ---- profile & preferences ------------------------------------------------ */

export const getPassengerProfile = async (): Promise<PassengerProfile> => {
  const res = await api.get<{ passenger: PassengerProfile }>(BASE);
  return (res.data as { passenger: PassengerProfile }).passenger;
};

export const updatePreferences = async (
  patch: PreferencesPatch
): Promise<PassengerProfile> => {
  const res = await api.patch<{ passenger: PassengerProfile }>(BASE, patch);
  return (res.data as { passenger: PassengerProfile }).passenger;
};

/* ---- favourites --------------------------------------------------------- */

export const listFavourites = async (): Promise<Favourites> => {
  const res = await api.get<Favourites>(`${BASE}/favourites`);
  return res.data ?? { routes: [], stops: [] };
};

export const addFavourite = async (
  type: FavouriteType,
  targetId: string
): Promise<Favourites> => {
  const res = await api.post<Favourites>(`${BASE}/favourites`, { type, targetId });
  return res.data ?? { routes: [], stops: [] };
};

export const removeFavourite = async (
  type: FavouriteType,
  targetId: string
): Promise<Favourites> => {
  const res = await api.del<Favourites>(
    `${BASE}/favourites/${targetId}?type=${type}`
  );
  return res.data ?? { routes: [], stops: [] };
};

/* ---- saved locations -------------------------------------------------- */

export const listSavedLocations = async (): Promise<SavedLocation[]> => {
  const res = await api.get<{ locations: SavedLocation[] }>(
    `${BASE}/saved-locations`
  );
  return res.data?.locations ?? [];
};

export const createSavedLocation = async (
  input: SavedLocationInput
): Promise<SavedLocation> => {
  const res = await api.post<{ location: SavedLocation }>(
    `${BASE}/saved-locations`,
    input
  );
  return (res.data as { location: SavedLocation }).location;
};

export const updateSavedLocation = async (
  id: string,
  input: Partial<SavedLocationInput>
): Promise<SavedLocation> => {
  const res = await api.patch<{ location: SavedLocation }>(
    `${BASE}/saved-locations/${id}`,
    input
  );
  return (res.data as { location: SavedLocation }).location;
};

export const deleteSavedLocation = async (id: string): Promise<void> => {
  await api.del(`${BASE}/saved-locations/${id}`);
};
