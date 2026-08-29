export interface Complaint {
  _id: string;
  category: string;
  status: string;
  passenger?: string;
  vehicle?: string;
  route?: string;
  trip?: string;
  message: string;
  rating?: number;
  attachments?: string[];
  assignedTo?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintInput {
  category: string;
  status?: string;
  vehicle?: string;
  route?: string;
  trip?: string;
  message: string;
  rating?: number;
  attachments?: string[];
  assignedTo?: string;
  resolutionNote?: string;
}
