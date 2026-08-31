export interface PassengerNotificationPrefs {
  serviceAlerts: boolean;
  favourites: boolean;
  promotions: boolean;
}

export interface PassengerPreferences {
  language: string;
  theme: "light" | "dark" | "system";
  notifications: PassengerNotificationPrefs;
  seatPreference?: string | null;
}

export interface PassengerProfile {
  userId: string;
  preferences: PassengerPreferences;
  favouriteRouteIds: string[];
  favouriteStopIds: string[];
  blocked?: boolean;
  blockedReason?: string | null;
}

export type PreferencesPatch = {
  language?: string;
  theme?: "light" | "dark" | "system";
  seatPreference?: string | null;
  notifications?: Partial<PassengerNotificationPrefs>;
};

export interface Favourites {
  routes: string[];
  stops: string[];
}

export type FavouriteType = "route" | "stop";

export interface SavedLocation {
  _id: string;
  name: string;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  address?: string | null;
  isHome: boolean;
  isWork: boolean;
  createdAt?: string;
}

export interface SavedLocationInput {
  name: string;
  location: { lng: number; lat: number };
  address?: string | null;
  isHome?: boolean;
  isWork?: boolean;
}
