export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface Stop {
  _id: string;
  name: string;
  code?: string;
  location: GeoPoint;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StopInput {
  name: string;
  code?: string;
  location: GeoPoint;
  address?: string;
  isActive?: boolean;
}
