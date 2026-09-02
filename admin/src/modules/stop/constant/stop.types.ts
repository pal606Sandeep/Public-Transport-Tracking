export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Stop {
  _id: string;
  name: string;
  code: string | null;
  location: GeoPoint;
  address: string | null;
  facilities: (string | null)[];
  shelter: string | null;
  accessibility: boolean;
  nearbyLandmarks: (string | null)[];
  routes: string[];
  distanceMeters?: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StopInput {
  name: string;
  code?: string | null;
  location: GeoPoint;
  address?: string | null;
  facilities?: string[];
  shelter?: string | null;
  accessibility?: boolean;
  nearbyLandmarks?: string[];
  isActive?: boolean;
}

export interface StopListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
