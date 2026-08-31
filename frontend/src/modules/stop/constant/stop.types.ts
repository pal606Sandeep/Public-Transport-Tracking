export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface Stop {
  _id: string;
  name: string;
  code?: string | null;
  location: GeoPoint;
  address?: string | null;
  facilities?: string[];
  shelter?: string | null;
  accessibility?: boolean;
  nearbyLandmarks?: string[];
  routes?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StopListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  /** nearest-stop search */
  near?: { lat: number; lng: number; maxDistance?: number };
}
