export interface FareRule {
  _id: string;
  name: string;
  description: string | null;
  baseFare: number;
  perStopFare: number;
  perKmFare: number | null;
  minimumFare: number | null;
  currency: string;
  acceptedPaymentMethods: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FareRuleInput {
  name: string;
  description?: string | null;
  baseFare: number;
  perStopFare: number;
  perKmFare?: number | null;
  minimumFare?: number | null;
  currency?: string;
  acceptedPaymentMethods?: string[];
  isActive?: boolean;
}

export const FARE_TYPES = ["ROUTE", "DISTANCE", "STAGE"] as const;
export type FareType = (typeof FARE_TYPES)[number];

export interface Fare {
  _id: string;
  name: string;
  type: FareType;
  isActive: boolean;
  route: string | null;
  fromStop: string | null;
  toStop: string | null;
  amount: number;
  distanceFromKm: number | null;
  distanceToKm: number | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface FareInput {
  name: string;
  type: FareType;
  isActive?: boolean;
  route?: string | null;
  fromStop?: string | null;
  toStop?: string | null;
  amount: number;
  distanceFromKm?: number | null;
  distanceToKm?: number | null;
  priority?: number;
}

export const CONCESSION_TYPES = [
  "STUDENT",
  "SENIOR",
  "DISABLED",
  "VETERAN",
  "LOW_INCOME",
  "GENERAL",
] as const;
export type ConcessionType = (typeof CONCESSION_TYPES)[number];

export interface Concession {
  _id: string;
  name: string;
  code: string;
  type: ConcessionType;
  discountPercent: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  maxPerDay: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConcessionInput {
  name: string;
  code: string;
  type: ConcessionType;
  discountPercent: number;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  maxPerDay?: number | null;
}

export const PASS_TYPES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "STUDENT",
  "SENIOR",
] as const;
export type PassType = (typeof PASS_TYPES)[number];

export interface Pass {
  _id: string;
  name: string;
  type: PassType;
  price: number;
  currency: string;
  durationDays: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  unlimited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PassInput {
  name: string;
  type: PassType;
  price: number;
  currency?: string;
  durationDays?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  unlimited?: boolean;
}
