export interface Route {
  _id: string;
  name: string;
  routeNumber: string;
  startStop?: string;
  endStop?: string;
  stops: string[];
  distanceKm?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteInput {
  name: string;
  routeNumber: string;
  startStop?: string;
  endStop?: string;
  stops?: string[];
  distanceKm?: number;
  isActive?: boolean;
}
