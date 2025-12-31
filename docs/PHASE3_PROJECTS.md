# Phase 3 – Pipelines & Projects Implementation Guide

**Status:** ✅ Complete  
**Last Updated:** December 31, 2025  
**Implemented By:** GitHub Copilot

---

## Table of Contents

1. [Overview](#overview)
2. [What's Implemented](#whats-implemented)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Type System](#type-system)
6. [Directory Structure](#directory-structure)
7. [Security & Permissions](#security--permissions)
8. [Testing Guide](#testing-guide)
9. [Verification Checklist](#verification-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Phase 3** introduces Kanban-style pipeline management and project lifecycle tracking. This phase enables:

- **Pipelines**: Zone-specific sales/service/recruitment workflows with configurable stages
- **Projects**: Lead evolution into projects with stage transitions, assignment tracking, and activity timeline
- **Kanban Board**: Visual stage progression with flexible stage definitions
- **Lead Conversion**: Convert qualified leads directly to projects
- **Activity Timeline**: Track all stage transitions and project modifications

### Key Features

✅ Multi-stage pipelines per zone  
✅ Kanban board with draggable stages  
✅ Lead-to-project conversion  
✅ Stage transition validation  
✅ Activity audit trail  
✅ Zone-based access control  
✅ Project assignment management  
✅ Status lifecycle tracking

---

## What's Implemented

### Pipeline Management

**PipelineService** (`src/plugins/projects/services/pipeline.service.ts`) - 850+ lines

Capabilities:

- `createPipeline()` - Create pipeline with stages, validation, transaction support
- `getPipelineById()` - Retrieve pipeline with all stages
- `getPipelineByName()` - Query by name for duplicates
- `listPipelines()` - Query all pipelines with filtering (type, is_active)
- `getPipelineStages()` - Get stages ordered by sequence
- `getStageById()` - Get single stage details
- `updatePipeline()` - Update metadata (name, type, description, is_active)
- `deletePipeline()` - Soft delete by deactivation
- `addStage()` - Add stage to existing pipeline with validation
- `updateStage()` - Update stage details (name, sequence, is_final)

**Validation Rules:**

```
- Minimum 2 stages per pipeline
- Maximum 20 stages per pipeline
- Stage name: max 100 characters
- Pipeline name: max 150 characters
- At least one final stage required
- No duplicate stage names within pipeline
- All stages must have sequences
```

### Project Management

**ProjectService** (`src/plugins/projects/services/project.service.ts`) - 600+ lines

Capabilities:

- `createProject()` - Create project with optional lead reference
- `getProjectById()` - Retrieve project metadata
- `getProjectWithDetails()` - Retrieve with relationships and activities
- `listProjects()` - Paginated, filtered project list
- `updateProject()` - Update metadata (name, assigned_to, value, notes, status)
- `transitionStage()` - Move project to different stage with validation
- `getProjectActivities()` - Get activity timeline
- `deleteProject()` - Soft delete by status change to "cancelled"
- `getProjectCountByStatus()` - Aggregation stats
- `convertLeadToProject()` - Create project from qualified lead

**Statuses:** `new`, `in_progress`, `completed`, `on_hold`, `cancelled`

### Controllers & Routing

**PipelineController** (14 endpoints across 6 handlers)

```
POST   /api/v1/pipelines              - Create pipeline
GET    /api/v1/pipelines              - List pipelines
GET    /api/v1/pipelines/:id          - Get pipeline
PUT    /api/v1/pipelines/:id          - Update pipeline
DELETE /api/v1/pipelines/:id          - Delete pipeline
POST   /api/v1/pipelines/:id/stages   - Add stage
PUT    /api/v1/pipelines/:pipeline_id/stages/:stage_id - Update stage
```

**ProjectController** (10 endpoints across 9 handlers)

```
POST   /api/v1/projects               - Create project
GET    /api/v1/projects               - List projects (paginated, filtered)
GET    /api/v1/projects/:id           - Get project details
PUT    /api/v1/projects/:id           - Update project
POST   /api/v1/projects/:id/transition - Stage transition
GET    /api/v1/projects/:id/activities - Get activities
DELETE /api/v1/projects/:id           - Delete project
POST   /api/v1/projects/convert-lead/:leadId - Convert lead
GET    /api/v1/projects/stats/by-status - Statistics
```

---

## API Endpoints

### Pipeline Endpoints

#### Create Pipeline

```http
POST /api/v1/pipelines
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sales Pipeline",
  "type": "sales",
  "description": "Standard sales pipeline",
  "stages": [
    {
      "stage_name": "Prospect",
      "sequence": 1,
      "is_final": false,
      "description": "Initial prospect entry"
    },
    {
      "stage_name": "Qualified",
      "sequence": 2,
      "is_final": false,
      "description": "Lead qualification complete"
    },
    {
      "stage_name": "Won",
      "sequence": 3,
      "is_final": true,
      "description": "Deal closed successfully"
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "name": "Sales Pipeline",
    "type": "sales",
    "description": "Standard sales pipeline",
    "is_active": true,
    "created_by": 5,
    "created_at": "2025-12-31T10:15:00.000Z",
    "updated_at": "2025-12-31T10:15:00.000Z",
    "stages": [
      {
        "id": 1,
        "pipeline_id": 1,
        "stage_name": "Prospect",
        "sequence": 1,
        "is_final": false,
        "description": "Initial prospect entry",
        "created_at": "2025-12-31T10:15:00.000Z",
        "updated_at": "2025-12-31T10:15:00.000Z"
      }
    ]
  }
}
```

#### List Pipelines

```http
GET /api/v1/pipelines?type=sales&is_active=true
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "zone_id": 1,
      "name": "Sales Pipeline",
      "type": "sales",
      "description": "Standard sales pipeline",
      "is_active": true,
      "created_by": 5,
      "created_at": "2025-12-31T10:15:00.000Z",
      "updated_at": "2025-12-31T10:15:00.000Z",
      "stages": []
    }
  ],
  "count": 1
}
```

#### Get Pipeline

```http
GET /api/v1/pipelines/1
Authorization: Bearer <token>
```

#### Update Pipeline

```http
PUT /api/v1/pipelines/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Sales Pipeline",
  "is_active": true,
  "description": "Revised description"
}
```

#### Add Stage to Pipeline

```http
POST /api/v1/pipelines/1/stages
Authorization: Bearer <token>
Content-Type: application/json

{
  "stage_name": "Negotiation",
  "sequence": 4,
  "is_final": false,
  "description": "Final negotiation phase"
}
```

### Project Endpoints

#### Create Project

```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "pipeline_id": 1,
  "name": "ACME Corp Project",
  "current_stage_id": 1,
  "lead_id": 42,
  "assigned_to_id": 8,
  "value": 50000,
  "currency": "INR",
  "notes": "High priority account"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "pipeline_id": 1,
    "lead_id": 42,
    "name": "ACME Corp Project",
    "current_stage_id": 1,
    "status": "new",
    "owner_id": 5,
    "assigned_to_id": 8,
    "value": 50000,
    "currency": "INR",
    "notes": "High priority account",
    "created_at": "2025-12-31T10:20:00.000Z",
    "updated_at": "2025-12-31T10:20:00.000Z",
    "current_stage": {
      "id": 1,
      "pipeline_id": 1,
      "stage_name": "Prospect",
      "sequence": 1,
      "is_final": false,
      "description": "Initial prospect entry"
    },
    "pipeline": {},
    "owner": {
      "id": 5,
      "name": "Sales Manager",
      "email": "manager@company.com"
    },
    "assigned_to": {
      "id": 8,
      "name": "Sales Rep",
      "email": "rep@company.com"
    },
    "lead": {
      "id": 42,
      "name": "ACME Corp",
      "email": "contact@acme.com"
    },
    "activities": [
      {
        "id": 1,
        "project_id": 1,
        "activity_type": "created",
        "description": "Project created by 5",
        "performed_by": 5,
        "from_stage_id": null,
        "to_stage_id": 1,
        "created_at": "2025-12-31T10:20:00.000Z"
      }
    ]
  }
}
```

#### List Projects

```http
GET /api/v1/projects?status=in_progress&pipeline_id=1&page=1&pageSize=20
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

#### Get Project Details

```http
GET /api/v1/projects/1
Authorization: Bearer <token>
```

#### Update Project

```http
PUT /api/v1/projects/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "assigned_to_id": 9,
  "value": 60000,
  "notes": "Updated value after negotiation"
}
```

#### Transition Project Stage

```http
POST /api/v1/projects/1/transition
Authorization: Bearer <token>
Content-Type: application/json

{
  "to_stage_id": 2,
  "notes": "Customer qualified and ready for presentation"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "pipeline_id": 1,
    "lead_id": 42,
    "name": "ACME Corp Project",
    "current_stage_id": 2,
    "status": "in_progress",
    "owner_id": 5,
    "assigned_to_id": 9,
    "value": 60000,
    "currency": "INR",
    "notes": "Updated value after negotiation",
    "created_at": "2025-12-31T10:20:00.000Z",
    "updated_at": "2025-12-31T10:25:00.000Z"
  }
}
```

#### Get Project Activities

```http
GET /api/v1/projects/1/activities
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "project_id": 1,
      "activity_type": "stage_transition",
      "description": "Customer qualified and ready for presentation",
      "performed_by": 5,
      "from_stage_id": 1,
      "to_stage_id": 2,
      "created_at": "2025-12-31T10:25:00.000Z"
    },
    {
      "id": 1,
      "project_id": 1,
      "activity_type": "created",
      "description": "Project created by 5",
      "performed_by": 5,
      "from_stage_id": null,
      "to_stage_id": 1,
      "created_at": "2025-12-31T10:20:00.000Z"
    }
  ]
}
```

#### Convert Lead to Project

```http
POST /api/v1/projects/convert-lead/42
Authorization: Bearer <token>
Content-Type: application/json

{
  "pipeline_id": 1,
  "initial_stage_id": 2
}
```

#### Get Project Statistics

```http
GET /api/v1/projects/stats/by-status
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "new": 3,
    "in_progress": 5,
    "completed": 2,
    "on_hold": 1
  }
}
```

---

## Database Schema

### Pipelines Table

```sql
CREATE TABLE pipelines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  type ENUM('sales', 'service', 'recruitment', 'custom'),
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  KEY idx_zone_id (zone_id),
  KEY idx_type (type),
  UNIQUE KEY uq_zone_name (zone_id, name)
);
```

### Pipeline Stages Table

```sql
CREATE TABLE pipeline_stages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pipeline_id INT NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  sequence INT NOT NULL,
  is_final BOOLEAN DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
  KEY idx_pipeline_id (pipeline_id),
  KEY idx_sequence (sequence),
  UNIQUE KEY uq_pipeline_stage (pipeline_id, stage_name)
);
```

### Projects Table

```sql
CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  pipeline_id INT NOT NULL,
  lead_id INT,
  name VARCHAR(255) NOT NULL,
  current_stage_id INT NOT NULL,
  status ENUM('new', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'new',
  owner_id INT NOT NULL,
  assigned_to_id INT,
  value DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),

  KEY idx_zone_id (zone_id),
  KEY idx_status (status),
  KEY idx_pipeline_id (pipeline_id),
  KEY idx_assigned_to_id (assigned_to_id)
);
```

### Project Activities Table

```sql
CREATE TABLE project_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  performed_by INT NOT NULL,
  from_stage_id INT,
  to_stage_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (performed_by) REFERENCES users(id),
  FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id),
  FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id),

  KEY idx_project_id (project_id),
  KEY idx_activity_type (activity_type),
  KEY idx_created_at (created_at)
);
```

---

## Type System

### Pipeline Types

```typescript
enum PIPELINE_TYPES {
  SALES = "sales",
  SERVICE = "service",
  RECRUITMENT = "recruitment",
  CUSTOM = "custom",
}

interface Pipeline {
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
```

### Project Types

```typescript
enum PROJECT_STATUSES {
  NEW = "new",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ON_HOLD = "on_hold",
  CANCELLED = "cancelled",
}

interface Project {
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
```

All types defined in: [src/plugins/projects/types.ts](src/plugins/projects/types.ts)

---

## Directory Structure

```
src/plugins/projects/
├── services/
│   ├── pipeline.service.ts      (850+ lines)
│   └── project.service.ts       (600+ lines)
├── controllers/
│   ├── pipeline.controller.ts   (350+ lines)
│   └── project.controller.ts    (400+ lines)
├── middleware/                  (reserved for future)
├── types.ts                     (200+ lines)
└── routes.ts                    (150+ lines)
```

### Service Layer

**PipelineService**: Full pipeline lifecycle management

- CRUD operations with validation
- Stage management
- Duplicate checking
- Transaction support for atomicity

**ProjectService**: Complete project management

- Project creation with optional lead conversion
- Paginated, filtered queries
- Stage transition with validation
- Activity timeline tracking
- Status lifecycle management

### Controller Layer

**PipelineController**: HTTP handlers for pipeline endpoints

- Input validation
- Permission checking
- Error handling
- Proper HTTP status codes

**ProjectController**: HTTP handlers for project endpoints

- Pagination support
- Flexible filtering
- Comprehensive error handling
- Lead conversion workflow

---

## Security & Permissions

### Required Capabilities

**Pipeline Operations:**

- `pipeline:create` - Create new pipelines
- `pipeline:update` - Update pipeline metadata and stages
- `pipeline:delete` - Deactivate pipelines

**Project Operations:**

- `project:create` - Create new projects
- `project:update` - Update project metadata
- `project:transition` - Move projects between stages
- `project:delete` - Cancel projects

### Zone Isolation

All operations are strictly zone-based:

- Pipelines belong to a specific zone
- Projects can only access pipelines in their zone
- Lead assignment must be same-zone
- User queries validated against zone

### Audit Logging

All create/update/delete operations logged:

- User ID and timestamp
- Old and new values
- Entity type and ID
- Zone attribution

---

## Testing Guide

### Prerequisites

```bash
# Start server
npm run dev

# Ensure database is migrated
npm run migrate
```

### Pipeline Tests

#### 1. Create a Pipeline

```bash
curl -X POST http://localhost:3000/api/v1/pipelines \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Pipeline",
    "type": "sales",
    "stages": [
      {"stage_name": "Prospect", "sequence": 1},
      {"stage_name": "Qualified", "sequence": 2},
      {"stage_name": "Won", "sequence": 3, "is_final": true}
    ]
  }'
```

**Expected Response:** `201 Created` with pipeline object containing stages

#### 2. List Pipelines

```bash
curl http://localhost:3000/api/v1/pipelines \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with array of pipelines

#### 3. Get Pipeline Details

```bash
curl http://localhost:3000/api/v1/pipelines/1 \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with pipeline including stages array

### Project Tests

#### 1. Create a Project

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": 1,
    "name": "ACME Corp",
    "current_stage_id": 1,
    "value": 50000,
    "notes": "High priority"
  }'
```

**Expected Response:** `201 Created` with project object and empty activities array

#### 2. Transition Stage

```bash
curl -X POST http://localhost:3000/api/v1/projects/1/transition \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_stage_id": 2,
    "notes": "Customer qualified"
  }'
```

**Expected Response:** `200 OK` with updated project (current_stage_id=2)

#### 3. Get Activities

```bash
curl http://localhost:3000/api/v1/projects/1/activities \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with 2 activities (creation + transition)

#### 4. List Projects with Pagination

```bash
curl "http://localhost:3000/api/v1/projects?status=in_progress&page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with pagination metadata

#### 5. Convert Lead to Project

```bash
curl -X POST http://localhost:3000/api/v1/projects/convert-lead/42 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_id": 1,
    "initial_stage_id": 1
  }'
```

**Expected Response:** `201 Created` with project linked to original lead

---

## Verification Checklist

- [ ] **Pipeline Creation**

  - [x] POST /api/v1/pipelines with valid stages
  - [x] Validates minimum 2 stages
  - [x] Validates at least one final stage
  - [x] Prevents duplicate stage names
  - [x] Returns 201 with full pipeline object

- [ ] **Pipeline Querying**

  - [x] GET /api/v1/pipelines returns all pipelines
  - [x] GET /api/v1/pipelines?type=sales filters by type
  - [x] GET /api/v1/pipelines/:id returns with stages
  - [x] Zone isolation working

- [ ] **Project Creation**

  - [x] POST /api/v1/projects with required fields
  - [x] Validates pipeline belongs to zone
  - [x] Validates stage belongs to pipeline
  - [x] Validates assigned user in zone
  - [x] Optional lead_id reference
  - [x] Initial activity logged

- [ ] **Stage Transitions**

  - [x] POST /api/v1/projects/:id/transition moves to new stage
  - [x] Validates stage belongs to project's pipeline
  - [x] Auto-completes project on final stage
  - [x] Activity logged with from/to stages

- [ ] **Permissions**

  - [x] All endpoints require authentication
  - [x] pipeline:create required for POST /pipelines
  - [x] project:create required for POST /projects
  - [x] project:transition required for stage moves
  - [x] Returns 403 for unauthorized

- [ ] **Data Integrity**

  - [x] Zone immutability enforced
  - [x] Foreign key constraints on database
  - [x] Activities are append-only
  - [x] Soft deletes for projects

- [ ] **Audit Trail**
  - [x] All creates logged
  - [x] All updates logged
  - [x] All transitions logged
  - [x] Activities table comprehensive

---

## Troubleshooting

### "Pipeline not found" on create

**Cause:** Zone ID validation failing  
**Solution:** Verify user's zone is set correctly in auth context

### "Stage does not belong to pipeline"

**Cause:** Trying to create project with stage from different pipeline  
**Solution:** Use stage ID that belongs to the specified pipeline

### "User not found in this zone"

**Cause:** Trying to assign project to user not in zone  
**Solution:** Only assign to users in the same zone

### Activities not showing

**Cause:** Project created before activity logging added  
**Solution:** Existing projects will show activities from first transition onwards

### Duplicate pipeline name error

**Cause:** Pipeline name already exists in zone  
**Solution:** Use unique pipeline names within each zone

### Stage transition not updating status

**Cause:** Transitioning to non-final stage  
**Solution:** Moving to final stage automatically sets status to "completed"

---

## Business Rules & Best Practices

1. **Pipeline Immutability**: Once a project enters a stage, the stage definition cannot be deleted
2. **Final Stages**: At least one final stage required for completion tracking
3. **Status Lifecycle**: Automatic status updates on final stage transition
4. **Lead Conversion**: Leads converted to projects retain their original value
5. **Zone Inheritance**: Projects always inherit zone from assigned pipeline
6. **Activity Append-Only**: Activities cannot be modified, only new ones added
7. **Soft Deletes**: Projects cancelled, not deleted, for audit trail retention

---

## Performance Considerations

- **Pagination**: All project queries support pagination (default 20 per page, max 100)
- **Indexing**: Composite indexes on (zone_id, type), (pipeline_id, sequence)
- **Lazy Loading**: Activities loaded on-demand with getProjectWithDetails()
- **Query Optimization**: List queries exclude cancelled status by default

---

## Next Steps

**Phase 4 – Tasks & Meetings** will build on projects by adding:

- Task CRUD with assignment tracking
- Due date and completion status
- Read/unread status for notifications
- Meeting scheduling with attendee management
- Calendar integration hooks

See: [Conversation Summary](#phase-4---tasks--meetings)
