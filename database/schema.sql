-- ============================================================================
-- Zone-Based Internal CRM - Database Schema
-- Version: 1.0
-- Created: 2025-12-31
-- ============================================================================

-- Drop existing tables (for fresh setup)
-- Uncomment below for clean slate:
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS pricing_audit;
-- DROP TABLE IF EXISTS price_list_items;
-- DROP TABLE IF EXISTS price_lists;
-- DROP TABLE IF EXISTS meeting_notes;
-- DROP TABLE IF EXISTS meeting_attendees;
-- DROP TABLE IF EXISTS meetings;
-- DROP TABLE IF EXISTS tasks;
-- DROP TABLE IF EXISTS projects;
-- DROP TABLE IF EXISTS pipeline_stages;
-- DROP TABLE IF EXISTS pipelines;
-- DROP TABLE IF EXISTS lead_activities;
-- DROP TABLE IF EXISTS leads;
-- DROP TABLE IF EXISTS role_capabilities;
-- DROP TABLE IF EXISTS capabilities;
-- DROP TABLE IF EXISTS roles;
-- DROP TABLE IF EXISTS user_zones;
-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS zones;
-- DROP TABLE IF EXISTS daily_closing;

-- ============================================================================
-- 1. ZONES (Foundation - Zone Hierarchy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id INT,
  level ENUM('root', 'region', 'branch', 'team') NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES zones(id) ON DELETE SET NULL,
  INDEX idx_parent (parent_id),
  INDEX idx_code (code),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. USERS (Core User Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. USER_ZONES (User-Zone Mapping - Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  zone_id INT NOT NULL,
  role ENUM('super_admin', 'zone_admin', 'manager', 'staff', 'viewer') NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_zone (user_id, zone_id),
  INDEX idx_user_id (user_id),
  INDEX idx_zone_id (zone_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ROLES (Global Role Definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. CAPABILITIES (Fine-Grained Permissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module ENUM('core', 'leads', 'projects', 'tasks', 'meetings', 'pricing', 'reports') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. ROLE_CAPABILITIES (Role-Capability Mapping - Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_capabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  capability_id INT NOT NULL,
  
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (capability_id) REFERENCES capabilities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_cap (role_id, capability_id),
  INDEX idx_role_id (role_id),
  INDEX idx_capability_id (capability_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. LEADS (Lead Management - Zone Owned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  status ENUM('new', 'contacted', 'interested', 'proposal', 'won', 'lost') DEFAULT 'new',
  owner_id INT,
  created_by_id INT NOT NULL,
  source VARCHAR(100),
  value DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_owner_id (owner_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. LEAD_ACTIVITIES (Activity Timeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  activity_type ENUM('call', 'email', 'meeting', 'note', 'status_change', 'assignment') NOT NULL,
  description TEXT,
  performed_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_lead_id (lead_id),
  INDEX idx_activity_type (activity_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. PIPELINES (Zone-Specific Sales Pipelines)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipelines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('sales', 'project', 'support') DEFAULT 'sales',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_is_active (is_active),
  UNIQUE KEY unique_pipeline (zone_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. PIPELINE_STAGES (Configurable Pipeline Stages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pipeline_id INT NOT NULL,
  stage_name VARCHAR(255) NOT NULL,
  stage_order INT NOT NULL,
  description TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  auto_calculate_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  INDEX idx_pipeline_id (pipeline_id),
  UNIQUE KEY unique_stage_order (pipeline_id, stage_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. PROJECTS (Projects from Leads - Zone Owned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  lead_id INT,
  name VARCHAR(255) NOT NULL,
  status ENUM('initiation', 'planning', 'execution', 'closure', 'archived') DEFAULT 'initiation',
  pipeline_id INT,
  current_stage_id INT,
  owner_id INT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL,
  FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_status (status),
  INDEX idx_owner_id (owner_id),
  INDEX idx_created_by (created_by_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. TASKS (Task Management - Zone Owned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to_id INT NOT NULL,
  assigned_by_id INT NOT NULL,
  status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  due_date DATE,
  related_to_type ENUM('lead', 'project', 'meeting'),
  related_to_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_assigned_to (assigned_to_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. MEETINGS (Meeting Management - Zone Owned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS meetings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start DATETIME NOT NULL,
  scheduled_end DATETIME NOT NULL,
  organizer_id INT NOT NULL,
  related_to_type ENUM('lead', 'project'),
  related_to_id INT,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_scheduled_start (scheduled_start),
  INDEX idx_status (status),
  INDEX idx_organizer_id (organizer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. MEETING_ATTENDEES (Meeting Attendee Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('invited', 'accepted', 'declined', 'tentative') DEFAULT 'invited',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendee (meeting_id, user_id),
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. MEETING_NOTES (Post-Meeting Notes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  created_by_id INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_created_by (created_by_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. PRICE_LISTS (Zone-Wise Pricing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_lists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  currency VARCHAR(3) DEFAULT 'INR',
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_is_active (is_active),
  INDEX idx_valid_from (valid_from),
  UNIQUE KEY unique_pricelist (zone_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. PRICE_LIST_ITEMS (Individual Price Items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_list_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  price_list_id INT NOT NULL,
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  applicable_from DATE NOT NULL,
  applicable_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
  INDEX idx_price_list_id (price_list_id),
  INDEX idx_product_code (product_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. PRICING_AUDIT (Pricing Change Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  price_list_id INT NOT NULL,
  item_id INT,
  action ENUM('created', 'updated', 'deleted', 'activated', 'deactivated') NOT NULL,
  old_value JSON,
  new_value JSON,
  changed_by_id INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_price_list_id (price_list_id),
  INDEX idx_changed_at (changed_at),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 19. DAILY_CLOSING (Daily Close-of-Business Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_closing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  report_date DATE NOT NULL,
  total_leads INT DEFAULT 0,
  new_leads INT DEFAULT 0,
  leads_contacted INT DEFAULT 0,
  leads_converted INT DEFAULT 0,
  total_projects INT DEFAULT 0,
  completed_projects INT DEFAULT 0,
  on_time_projects INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  achieved_target DECIMAL(5, 2) DEFAULT 0,
  submitted_by_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_date (zone_id, report_date),
  INDEX idx_report_date (report_date),
  UNIQUE KEY unique_closing (zone_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 20. AUDIT_LOGS (Comprehensive Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  user_id INT NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  action ENUM('create', 'read', 'update', 'delete', 'assign', 'transition') NOT NULL,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_id (zone_id),
  INDEX idx_user_id (user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 21. SESSIONS (User Session Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA (Optional)
-- ============================================================================

-- Insert default roles
INSERT IGNORE INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full system access'),
  (2, 'zone_admin', 'Full control within assigned zone'),
  (3, 'manager', 'Team management and reporting'),
  (4, 'staff', 'Own leads/tasks only'),
  (5, 'viewer', 'Read-only access');

-- Insert base capabilities
INSERT IGNORE INTO capabilities (code, name, module, description) VALUES
  -- Core
  ('core.user.manage', 'Manage Users', 'core', 'Create/edit/delete users'),
  ('core.zone.manage', 'Manage Zones', 'core', 'Create/edit zone hierarchy'),
  ('core.role.manage', 'Manage Roles', 'core', 'Assign/modify roles'),
  
  -- Leads
  ('lead.create', 'Create Lead', 'leads', 'Create new leads'),
  ('lead.read', 'View Leads', 'leads', 'View leads'),
  ('lead.edit', 'Edit Lead', 'leads', 'Edit lead details'),
  ('lead.assign', 'Assign Lead', 'leads', 'Reassign lead ownership'),
  ('lead.delete', 'Delete Lead', 'leads', 'Delete lead'),
  
  -- Projects
  ('project.create', 'Create Project', 'projects', 'Create project from lead'),
  ('project.read', 'View Projects', 'projects', 'View projects'),
  ('project.edit', 'Edit Project', 'projects', 'Edit project'),
  ('project.transition', 'Transition Stage', 'projects', 'Move project stage'),
  
  -- Tasks
  ('task.create', 'Create Task', 'tasks', 'Create task'),
  ('task.read', 'View Tasks', 'tasks', 'View assigned tasks'),
  ('task.edit', 'Edit Task', 'tasks', 'Edit task'),
  ('task.assign', 'Assign Task', 'tasks', 'Assign task to user'),
  
  -- Meetings
  ('meeting.create', 'Schedule Meeting', 'meetings', 'Create meeting'),
  ('meeting.read', 'View Meetings', 'meetings', 'View meetings'),
  ('meeting.edit', 'Edit Meeting', 'meetings', 'Edit meeting'),
  
  -- Pricing
  ('pricing.read', 'View Pricing', 'pricing', 'View price lists'),
  ('pricing.edit', 'Edit Pricing', 'pricing', 'Create/edit prices'),
  ('pricing.apply', 'Apply Pricing', 'pricing', 'Apply pricing to lead/project'),
  
  -- Reports
  ('report.view', 'View Reports', 'reports', 'View zone reports'),
  ('report.export', 'Export Reports', 'reports', 'Export to CSV/PDF');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
