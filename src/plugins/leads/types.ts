// Lead-related types

export interface Lead {
  id: number;
  zoneId: number;
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  status: "new" | "contacted" | "interested" | "proposal" | "won" | "lost";
  ownerId?: number;
  createdById: number;
  source?: string;
  value?: number;
  currency: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadWithDetails extends Lead {
  ownerName?: string;
  createdByName?: string;
  activities: LeadActivity[];
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: "call" | "email" | "meeting" | "note" | "status_change" | "assignment";
  description: string;
  performedById: number;
  performedByName?: string;
  createdAt: Date;
}

export interface CreateLeadRequest {
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  source?: string;
  value?: number;
  notes?: string;
}

export interface UpdateLeadRequest {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: string;
  value?: number;
  notes?: string;
}

export interface AssignLeadRequest {
  newOwnerId: number;
}

export interface AddActivityRequest {
  type: "call" | "email" | "meeting" | "note" | "status_change" | "assignment";
  description: string;
}

export interface LeadFilters {
  zoneId?: number;
  status?: string;
  owner?: number;
  search?: string;
}

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "proposal",
  "won",
  "lost",
] as const;

export const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "note",
  "status_change",
  "assignment",
] as const;
