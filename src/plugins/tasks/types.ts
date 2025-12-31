/**
 * Phase 4 - Tasks & Meetings Types
 * Defines interfaces for task and meeting management
 */

// ============================================================================
// TASK TYPES
// ============================================================================

export enum TASK_PRIORITIES {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum TASK_STATUSES {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface Task {
  id: number;
  zone_id: number;
  title: string;
  description: string | null;
  priority: TASK_PRIORITIES;
  status: TASK_STATUSES;
  assigned_to_id: number | null;
  assigned_by_id: number;
  project_id: number | null;
  lead_id: number | null;
  due_date: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskWithDetails extends Task {
  assigned_to?: {
    id: number;
    name: string;
    email: string;
  };
  assigned_by?: {
    id: number;
    name: string;
    email: string;
  };
  project?: {
    id: number;
    name: string;
  };
  lead?: {
    id: number;
    name: string;
    email: string;
  };
  read_by?: TaskReadStatus[];
  comments?: TaskComment[];
}

export interface TaskReadStatus {
  id: number;
  task_id: number;
  user_id: number;
  read_at: Date;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TASK_PRIORITIES;
  assigned_to_id?: number;
  project_id?: number;
  lead_id?: number;
  due_date?: string; // ISO date string
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TASK_PRIORITIES;
  assigned_to_id?: number;
  status?: TASK_STATUSES;
  due_date?: string;
}

export interface MarkTaskCompleteRequest {
  completed_at?: string; // ISO timestamp
}

export interface MarkTaskReadRequest {
  // Body empty, implicitly marks as read
}

export interface AddTaskCommentRequest {
  comment: string;
}

// ============================================================================
// MEETING TYPES
// ============================================================================

export enum MEETING_TYPES {
  INTERNAL = "internal",
  CLIENT = "client",
  TEAM = "team",
  ONE_ON_ONE = "one_on_one",
}

export enum ATTENDEE_STATUS {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  TENTATIVE = "tentative",
}

export interface Meeting {
  id: number;
  zone_id: number;
  title: string;
  description: string | null;
  type: MEETING_TYPES;
  start_time: Date;
  end_time: Date;
  location: string | null;
  organizer_id: number;
  project_id: number | null;
  lead_id: number | null;
  meeting_link: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MeetingWithDetails extends Meeting {
  organizer?: {
    id: number;
    name: string;
    email: string;
  };
  attendees?: MeetingAttendee[];
  project?: {
    id: number;
    name: string;
  };
  lead?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface MeetingAttendee {
  id: number;
  meeting_id: number;
  user_id: number;
  status: ATTENDEE_STATUS;
  responded_at: Date | null;
  created_at: Date;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  type: MEETING_TYPES;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  location?: string;
  attendee_ids: number[];
  project_id?: number;
  lead_id?: number;
  meeting_link?: string;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  type?: MEETING_TYPES;
  start_time?: string;
  end_time?: string;
  location?: string;
  meeting_link?: string;
}

export interface SendMeetingInviteRequest {
  attendee_ids: number[];
}

export interface RespondToInviteRequest {
  status: ATTENDEE_STATUS;
}

export interface CancelMeetingRequest {
  reason?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface TaskValidationRules {
  title_max_length: number;
  description_max_length: number;
  allowed_priorities: TASK_PRIORITIES[];
  allowed_statuses: TASK_STATUSES[];
}

export interface MeetingValidationRules {
  title_max_length: number;
  description_max_length: number;
  min_attendees: number;
  max_attendees: number;
  min_duration_minutes: number;
  max_duration_hours: number;
}

export const TASK_VALIDATION_RULES: TaskValidationRules = {
  title_max_length: 255,
  description_max_length: 5000,
  allowed_priorities: Object.values(TASK_PRIORITIES),
  allowed_statuses: Object.values(TASK_STATUSES),
};

export const MEETING_VALIDATION_RULES: MeetingValidationRules = {
  title_max_length: 255,
  description_max_length: 5000,
  min_attendees: 1,
  max_attendees: 100,
  min_duration_minutes: 5,
  max_duration_hours: 8,
};
