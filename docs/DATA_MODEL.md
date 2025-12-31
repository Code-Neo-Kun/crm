# 📊 Data Model – Zone-Based CRM

**Version:** 1.0  
**Status:** Foundation (Step 1)  
**Last Updated:** 2025-12-31

---

## 1. Core Tables (Zone Foundation)

### `zones`

Defines zone hierarchy (geo/org/business unit)

```sql
CREATE TABLE zones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id INT,
  level ENUM('root', 'region', 'branch', 'team') NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (parent_id) REFERENCES zones(id),
  INDEX idx_parent (parent_id),
  INDEX idx_code (code),
  INDEX idx_level (level)
);
```

**Example Data:**

```
India (root)
├── Gujarat (region)
│   └── Ahmedabad (branch)
│       └── East Team (team)
├── Maharashtra (region)
│   └── Mumbai (branch)
```

---

### `users`

Core user account data

```sql
CREATE TABLE users (
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
  INDEX idx_username (username)
);
```

---

### `user_zones` ⭐

Maps users to zones (many-to-many)

```sql
CREATE TABLE user_zones (
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
);
```

**Rules:**

- User can belong to **multiple zones**
- Each user-zone pair has a **role**
- Primary zone is default context for user

---

### `roles`

Global role definitions (capabilities stored per role)

```sql
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name ENUM('super_admin', 'zone_admin', 'manager', 'staff', 'viewer'),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_role (name)
);
```

---

### `capabilities`

Fine-grained permission definitions

```sql
CREATE TABLE capabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module ENUM('core', 'leads', 'projects', 'tasks', 'meetings', 'pricing', 'reports') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_module (module)
);
```

**Example Capabilities:**

```
lead.create
lead.read
lead.edit
lead.assign
lead.delete
project.create
task.create
meeting.schedule
pricing.view
report.generate
```

---

### `role_capabilities`

Maps roles to capabilities (many-to-many)

```sql
CREATE TABLE role_capabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  capability_id INT NOT NULL,

  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (capability_id) REFERENCES capabilities(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_cap (role_id, capability_id)
);
```

---

## 2. Lead Management Tables

### `leads`

Core lead data with zone ownership

```sql
CREATE TABLE leads (
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
  INDEX idx_created_at (created_at)
);
```

---

### `lead_activities`

Timeline of interactions with leads

```sql
CREATE TABLE lead_activities (
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
);
```

---

## 3. Project & Pipeline Tables

### `pipelines`

Zone-specific sales/project pipelines

```sql
CREATE TABLE pipelines (
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
  UNIQUE KEY unique_pipeline (zone_id, name)
);
```

---

### `pipeline_stages`

Configurable stages within pipelines

```sql
CREATE TABLE pipeline_stages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pipeline_id INT NOT NULL,
  stage_name VARCHAR(255) NOT NULL,
  stage_order INT NOT NULL,
  description TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  auto_calculate_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  INDEX idx_pipeline_id (pipeline_id),
  UNIQUE KEY unique_stage_order (pipeline_id, stage_order)
);
```

---

### `projects`

Evolved leads with zone inheritance

```sql
CREATE TABLE projects (
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
  INDEX idx_owner_id (owner_id)
);
```

---

## 4. Task Management Tables

### `tasks`

Zone-aware task assignments

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to_id INT NOT NULL,
  assigned_by_id INT NOT NULL,
  status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  due_date DATE,
  related_to_type ENUM('lead', 'project', 'meeting') DEFAULT 'lead',
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
  INDEX idx_is_read (is_read)
);
```

---

## 5. Meeting & Calendar Tables

### `meetings`

Zone-inherited meetings

```sql
CREATE TABLE meetings (
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
  INDEX idx_status (status)
);
```

---

### `meeting_attendees`

Users invited to meetings (zone-restricted)

```sql
CREATE TABLE meeting_attendees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('invited', 'accepted', 'declined', 'tentative') DEFAULT 'invited',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendee (meeting_id, user_id),
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_user_id (user_id)
);
```

---

### `meeting_notes`

Follow-up notes post-meeting

```sql
CREATE TABLE meeting_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  created_by_id INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_meeting_id (meeting_id)
);
```

---

## 6. Pricing & Commercials Tables

### `price_lists`

Zone-wise pricing definitions

```sql
CREATE TABLE price_lists (
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
  INDEX idx_is_active (is_active)
);
```

---

### `price_list_items`

Individual price items per pricelist

```sql
CREATE TABLE price_list_items (
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
  INDEX idx_product_code (product_code)
);
```

---

### `pricing_audit`

Audit trail for pricing changes

```sql
CREATE TABLE pricing_audit (
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
  INDEX idx_changed_at (changed_at)
);
```

---

## 7. Reports & Analytics Tables

### `daily_closing`

Daily close-of-business reports

```sql
CREATE TABLE daily_closing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  report_date DATE NOT NULL,
  total_leads INT,
  new_leads INT,
  leads_contacted INT,
  leads_converted INT,
  total_projects INT,
  completed_projects INT,
  on_time_projects INT,
  total_revenue DECIMAL(12, 2),
  achieved_target DECIMAL(5, 2),
  submitted_by_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_zone_date (zone_id, report_date),
  UNIQUE KEY unique_closing (zone_id, report_date)
);
```

---

### `audit_logs`

Comprehensive audit trail for all major actions

```sql
CREATE TABLE audit_logs (
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
);
```

---

## 8. Session & Security Tables

### `sessions`

User session management

```sql
CREATE TABLE sessions (
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
  INDEX idx_expires (expires_at)
);
```

---

## 9. Data Relationships Summary

```
┌─ zones (root)
│  ├─ zones (parent_id FK)
│  ├─ user_zones (many users, many zones)
│  ├─ leads (zone_id)
│  ├─ projects (zone_id)
│  ├─ pipelines (zone_id)
│  ├─ tasks (zone_id)
│  ├─ meetings (zone_id)
│  ├─ price_lists (zone_id)
│  ├─ daily_closing (zone_id)
│  └─ audit_logs (zone_id)
│
├─ users
│  ├─ user_zones (user_id FK)
│  ├─ leads (owner_id, created_by_id)
│  ├─ projects (owner_id, created_by_id)
│  ├─ tasks (assigned_to_id, assigned_by_id)
│  ├─ meetings (organizer_id)
│  └─ sessions (user_id)
│
├─ leads (zone_id)
│  ├─ lead_activities
│  ├─ projects (lead_id FK)
│
├─ pipelines (zone_id)
│  ├─ pipeline_stages
│  └─ projects (pipeline_id, current_stage_id)
│
└─ roles + capabilities
   └─ role_capabilities (many-to-many)
```

---

## 10. Critical Rules (Enforced)

| Rule                    | Table                  | Validation                            |
| ----------------------- | ---------------------- | ------------------------------------- |
| **Zone Immutability**   | All entities           | zone_id cannot change post-creation   |
| **User–Zone Mapping**   | user_zones             | User must be in zone to access data   |
| **Cross-Zone Denial**   | All queries            | Filter by user's accessible zones     |
| **Assignment Boundary** | leads, projects, tasks | assigned/owner user must share zone   |
| **Audit Everything**    | audit_logs             | Major actions logged with user + zone |
| **Pricing Audit**       | pricing_audit          | All pricing changes logged            |

---

## 11. Indexing Strategy

**High-Priority Indexes:**

- `zones` → `parent_id`, `code`, `level`
- `users` → `email`, `username`
- `user_zones` → `user_id`, `zone_id`, `role`
- `leads` → `zone_id`, `owner_id`, `status`, `created_at`
- `projects` → `zone_id`, `status`, `owner_id`
- `tasks` → `zone_id`, `assigned_to_id`, `status`, `due_date`
- `meetings` → `zone_id`, `scheduled_start`, `status`
- `audit_logs` → `zone_id`, `user_id`, `entity_type`, `created_at`

---

## 12. Next Steps

1. ✅ Create SQL migration files (from this schema)
2. → Define Permission Matrix (Step 2)
3. → API contracts mapping
4. → ORM/Entity models in code
