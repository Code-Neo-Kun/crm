// Type definitions for the entire CRM system

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithZones extends User {
  zones: UserZone[];
  capabilities: string[];
  primaryZoneId?: number;
}

export interface UserZone {
  id: number;
  userId: number;
  zoneId: number;
  zoneName?: string;
  role: "super_admin" | "zone_admin" | "manager" | "staff" | "viewer";
  isPrimary: boolean;
  assignedAt: Date;
}

export interface AuthPayload {
  userId: number;
  username: string;
  email: string;
  zones: UserZone[];
  capabilities: string[];
  primaryZoneId: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserWithZones;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// Zones
// ============================================================================

export interface Zone {
  id: number;
  code: string;
  name: string;
  parentId?: number;
  level: "root" | "region" | "branch" | "team";
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoneWithChildren extends Zone {
  children: ZoneWithChildren[];
}

export interface ZoneHierarchy {
  id: number;
  code: string;
  name: string;
  level: string;
  parentId?: number;
  childCount: number;
  userCount: number;
}

// ============================================================================
// Roles & Capabilities
// ============================================================================

export interface Role {
  id: number;
  name: "super_admin" | "zone_admin" | "manager" | "staff" | "viewer";
  description: string;
  createdAt: Date;
}

export interface Capability {
  id: number;
  code: string;
  name: string;
  description?: string;
  module:
    | "core"
    | "leads"
    | "projects"
    | "tasks"
    | "meetings"
    | "pricing"
    | "reports";
  createdAt: Date;
}

export interface RoleCapability {
  roleId: number;
  capabilityId: number;
  capability: Capability;
}

// ============================================================================
// Permissions & Authorization
// ============================================================================

export interface PermissionContext {
  userId: number;
  role: string;
  accessibleZones: number[];
  capabilities: string[];
  primaryZoneId: number;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export interface ZoneAccessRule {
  entityZoneId: number;
  userZoneIds: number[];
}

// ============================================================================
// Audit
// ============================================================================

export interface AuditEntry {
  id?: number;
  zoneId: number;
  userId: number;
  entityType: string;
  entityId: number;
  action: "create" | "read" | "update" | "delete" | "assign" | "transition";
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface AuditLog {
  id: number;
  zoneId: number;
  userId: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================================================
// API Response Format
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  };
}

// ============================================================================
// Request Context (attached to Express request)
// ============================================================================

export interface RequestContext {
  userId: number;
  username: string;
  email: string;
  zones: UserZone[];
  capabilities: string[];
  primaryZoneId: number;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Session
// ============================================================================

export interface Session {
  id: number;
  userId: number;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

// ============================================================================
// Plugin System
// ============================================================================

export interface Migration {
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  timestamp: Date;
}

export interface SystemEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  sourceModule: string;
}
