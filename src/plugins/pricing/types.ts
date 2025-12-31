/**
 * Phase 5 - Pricing & Reporting Types
 * Defines interfaces for price lists and daily closing reports
 */

// ============================================================================
// PRICING TYPES
// ============================================================================

export enum PRICING_TIER_TYPES {
  STANDARD = "standard",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
  CUSTOM = "custom",
}

export interface PriceList {
  id: number;
  zone_id: number;
  name: string;
  description: string | null;
  currency: string;
  is_active: boolean;
  version: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface PriceListWithItems extends PriceList {
  items?: PriceListItem[];
}

export interface PriceListItem {
  id: number;
  price_list_id: number;
  item_name: string;
  item_code: string;
  tier: PRICING_TIER_TYPES;
  unit_price: number;
  quantity_breakpoint: number | null;
  discount_percentage: number;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PricingAuditEntry {
  id: number;
  price_list_id: number;
  action: "create" | "update" | "delete";
  changed_by: number;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  change_reason: string | null;
  created_at: Date;
}

export interface CreatePriceListRequest {
  name: string;
  description?: string;
  currency?: string;
  items: {
    item_name: string;
    item_code: string;
    tier: PRICING_TIER_TYPES;
    unit_price: number;
    quantity_breakpoint?: number;
    discount_percentage?: number;
    description?: string;
  }[];
}

export interface UpdatePriceListRequest {
  name?: string;
  description?: string;
  currency?: string;
  is_active?: boolean;
}

export interface UpdatePriceListItemRequest {
  item_name?: string;
  item_code?: string;
  tier?: PRICING_TIER_TYPES;
  unit_price?: number;
  quantity_breakpoint?: number;
  discount_percentage?: number;
  description?: string;
  is_active?: boolean;
}

export interface AddPriceListItemRequest {
  item_name: string;
  item_code: string;
  tier: PRICING_TIER_TYPES;
  unit_price: number;
  quantity_breakpoint?: number;
  discount_percentage?: number;
  description?: string;
}

// ============================================================================
// REPORTING TYPES
// ============================================================================

export enum REPORT_PERIOD {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export interface DailyClosing {
  id: number;
  zone_id: number;
  closing_date: Date;
  reporting_manager_id: number;
  total_leads: number;
  leads_converted: number;
  conversion_rate: number;
  total_projects: number;
  projects_completed: number;
  completion_rate: number;
  revenue_projected: number;
  revenue_confirmed: number;
  revenue_closed: number;
  total_tasks: number;
  tasks_completed: number;
  task_completion_rate: number;
  meetings_scheduled: number;
  meetings_completed: number;
  status: "draft" | "submitted" | "approved" | "archived";
  notes: string | null;
  approved_by: number | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DailyClosingMetrics extends DailyClosing {
  kpis?: KPIMetric[];
  variance_analysis?: VarianceAnalysis;
}

export interface KPIMetric {
  id: number;
  daily_closing_id: number;
  metric_name: string;
  metric_key: string;
  actual_value: number;
  target_value: number;
  variance: number;
  variance_percentage: number;
  status: "on_track" | "below_target" | "above_target";
  notes: string | null;
}

export interface VarianceAnalysis {
  id: number;
  daily_closing_id: number;
  revenue_variance: number;
  revenue_variance_percentage: number;
  completion_variance: number;
  conversion_variance: number;
  analysis: string | null;
  recommendations: string | null;
}

export interface ReportSummary {
  period: REPORT_PERIOD;
  start_date: Date;
  end_date: Date;
  total_leads: number;
  leads_converted: number;
  average_conversion_rate: number;
  total_revenue: number;
  average_revenue: number;
  total_projects: number;
  completed_projects: number;
  average_completion_rate: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  total_meetings: number;
  average_meetings_per_day: number;
}

export interface CreateDailyClosingRequest {
  closing_date: string; // ISO date
  total_leads?: number;
  leads_converted?: number;
  total_projects?: number;
  projects_completed?: number;
  revenue_projected?: number;
  revenue_confirmed?: number;
  revenue_closed?: number;
  total_tasks?: number;
  tasks_completed?: number;
  meetings_scheduled?: number;
  meetings_completed?: number;
  notes?: string;
}

export interface UpdateDailyClosingRequest {
  total_leads?: number;
  leads_converted?: number;
  total_projects?: number;
  projects_completed?: number;
  revenue_projected?: number;
  revenue_confirmed?: number;
  revenue_closed?: number;
  total_tasks?: number;
  tasks_completed?: number;
  meetings_scheduled?: number;
  meetings_completed?: number;
  notes?: string;
}

export interface ApproveDailyClosingRequest {
  notes?: string;
}

export interface SubmitDailyClosingRequest {
  notes?: string;
}

export interface GenerateReportRequest {
  period: REPORT_PERIOD;
  start_date: string; // ISO date
  end_date: string; // ISO date
  include_kpis?: boolean;
  include_variance?: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface PricingValidationRules {
  name_max_length: number;
  item_name_max_length: number;
  item_code_max_length: number;
  min_unit_price: number;
  max_unit_price: number;
  min_discount: number;
  max_discount: number;
}

export const PRICING_VALIDATION_RULES: PricingValidationRules = {
  name_max_length: 255,
  item_name_max_length: 255,
  item_code_max_length: 50,
  min_unit_price: 0,
  max_unit_price: 999999.99,
  min_discount: 0,
  max_discount: 100,
};
