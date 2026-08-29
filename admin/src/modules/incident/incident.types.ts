import type {
  IncidentStatus,
  IncidentType,
} from "../../constants/incidentStatus";

export interface Incident {
  _id: string;
  type: IncidentType | string;
  status: IncidentStatus | string;
  vehicle?: string;
  trip?: string;
  driver?: string;
  route?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  description?: string;
  assignedTo?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentInput {
  type: string;
  status?: string;
  vehicle?: string;
  trip?: string;
  driver?: string;
  route?: string;
  description?: string;
  assignedTo?: string;
  attachments?: string[];
}
