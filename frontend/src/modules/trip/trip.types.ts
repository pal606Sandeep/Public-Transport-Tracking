export interface Trip {
  _id: string;
  route: string;
  vehicle: string;
  driver?: string;
  schedule?: string;
  status: string;
  startTime?: string;
  endTime?: string;
  currentStop?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripInput {
  route: string;
  vehicle: string;
  driver?: string;
  schedule?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  currentStop?: string;
}
