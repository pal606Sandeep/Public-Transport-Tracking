export interface Fare {
  _id: string;
  route?: string;
  minKm?: number;
  maxKm?: number;
  amount: number;
  currency: string;
  passengerCategory?: string;
  concession?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FareInput {
  route?: string;
  minKm?: number;
  maxKm?: number;
  amount: number;
  currency?: string;
  passengerCategory?: string;
  concession?: string;
  isActive?: boolean;
}

export interface FareCalcInput {
  routeId: string;
  boardingStopId: string;
  destinationStopId: string;
  passengerCategory?: string;
  concessionId?: string;
}

export interface FareCalcResult {
  amount: number;
  currency: string;
  breakdown?: Record<string, number>;
  appliedConcession?: string;
}
