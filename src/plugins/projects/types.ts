/**
 * Phase 3 - Pipelines & Projects Types
 * Defines interfaces for pipeline management and project lifecycle
 */

// ============================================================================
// PIPELINE & STAGE TYPES
// ============================================================================

export enum PIPELINE_TYPES {
  SALES = "sales",
  SERVICE = "service",
  RECRUITMENT = "recruitment",
  CUSTOM = "custom",
}

export interface PipelineStage {
  id: number;
  pipeline_id: number;
  stage_name: string;
  sequence: number;
  is_final: boolean;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Pipeline {
  id: number;
  zone_id: number;
  name: string;
  type: PIPELINE_TYPES;
  description: string | null;
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  stages?: PipelineStage[];
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export enum PROJECT_STATUSES {
  NEW = "new",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ON_HOLD = "on_hold",
  CANCELLED = "cancelled",
}

export interface Project {
  id: number;
  zone_id: number;
  pipeline_id: number;
  lead_id: number | null;
  name: string;
  current_stage_id: number;
  status: PROJECT_STATUSES;
  owner_id: number;
  assigned_to_id: number | null;
  value: number | null;
  currency: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectWithDetails extends Project {
  current_stage?: PipelineStage;
  pipeline?: Pipeline;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  assigned_to?: {
    id: number;
    name: string;
    email: string;
  };
  lead?: {
    id: number;
    name: string;
    email: string;
  };
  activities?: ProjectActivity[];
}

export interface ProjectActivity {
  id: number;
  project_id: number;
  activity_type: string;
  description: string;
  performed_by: number;
  from_stage_id: number | null;
  to_stage_id: number | null;
  created_at: Date;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePipelineRequest {
  name: string;
  type: PIPELINE_TYPES;
  description?: string;
  stages: {
    stage_name: string;
    sequence: number;
    is_final?: boolean;
    description?: string;
  }[];
}

export interface UpdatePipelineRequest {
  name?: string;
  type?: PIPELINE_TYPES;
  description?: string;
  is_active?: boolean;
}

export interface CreateProjectRequest {
  pipeline_id: number;
  name: string;
  current_stage_id: number;
  lead_id?: number;
  assigned_to_id?: number;
  value?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  assigned_to_id?: number;
  value?: number;
  notes?: string;
  status?: PROJECT_STATUSES;
}

export interface TransitionStageRequest {
  to_stage_id: number;
  notes?: string;
}

export interface AddProjectActivityRequest {
  activity_type: string;
  description: string;
  from_stage_id?: number;
  to_stage_id?: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface PipelineValidationRules {
  min_stages: number;
  max_stages: number;
  stage_name_max_length: number;
  pipeline_name_max_length: number;
  allow_duplicate_names: boolean;
}

export const PIPELINE_VALIDATION_RULES: PipelineValidationRules = {
  min_stages: 2,
  max_stages: 20,
  stage_name_max_length: 100,
  pipeline_name_max_length: 150,
  allow_duplicate_names: false,
};
