export interface ServiceAlert {
  _id: string;
  title: string;
  message: string;
  severity: string;
  type: string;
  targetRouteIds?: string[];
  targetStopIds?: string[];
  targetAll?: boolean;
  startsAt: string;
  endsAt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAlertInput {
  title: string;
  message: string;
  severity: string;
  type: string;
  targetRouteIds?: string[];
  targetStopIds?: string[];
  targetAll?: boolean;
  startsAt: string;
  endsAt?: string;
  status?: string;
}
