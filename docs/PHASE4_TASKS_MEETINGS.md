# Phase 4 – Tasks & Meetings Implementation Guide

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

**Phase 4** introduces task management with assignment tracking and meeting scheduling with full attendee management. This phase enables:

- **Task Management**: Create, assign, track, and complete tasks with due dates
- **Priority & Status Tracking**: Urgent, high, medium, low priorities with todo/in-progress/completed/cancelled statuses
- **Task Visibility**: Read/unread status tracking to notify assignees
- **Task Comments**: Inline discussions on tasks for collaboration
- **Meeting Scheduling**: Create meetings with time validation and automatic attendee management
- **RSVP Management**: Attendees can accept, decline, or tentatively accept invitations
- **Calendar Integration Ready**: Upcoming meetings endpoint for calendar displays

### Key Features

✅ Task CRUD with priority and status management  
✅ Task assignment with same-zone validation  
✅ Due date tracking and overdue detection  
✅ Read/unread status for notification systems  
✅ Inline task comments for collaboration  
✅ Meeting creation with attendee management  
✅ RSVP acceptance/decline/tentative responses  
✅ Meeting duration validation (5 min - 8 hours)  
✅ Attendee statistics (pending/accepted/declined/tentative)  
✅ Upcoming meetings for calendar integration  
✅ Zone-based access control  
✅ Comprehensive audit logging

---

## What's Implemented

### Task Management

**TaskService** (`src/plugins/tasks/services/task.service.ts`) - 700+ lines

Capabilities:

- `createTask()` - Create task with optional project/lead reference and due date
- `getTaskById()` - Retrieve task metadata
- `getTaskWithDetails()` - Retrieve with relationships, read status, and comments
- `listTasks()` - Paginated, filtered query with 8 filter options
- `updateTask()` - Update title, description, priority, assignment, status, due date
- `markTaskComplete()` - Complete task with optional timestamp
- `markTaskAsRead()` - Track read status for notification systems
- `addComment()` - Add inline comments for collaboration
- `deleteTask()` - Soft delete by cancelling status
- `getTaskStatsByStatus()` - Aggregation stats
- `getOverdueTasks()` - Query past due tasks
- `getUserTaskAssignments()` - Get tasks assigned to specific user

**Task Filters:**

- By status (todo, in_progress, completed, cancelled)
- By priority (low, medium, high, urgent)
- By assigned user
- By assigner
- By project
- By lead
- By search term (title/description)
- By due date range
- Overdue only flag

### Meeting Management

**MeetingService** (`src/plugins/tasks/services/meeting.service.ts`) - 700+ lines

Capabilities:

- `createMeeting()` - Create meeting with attendees, time validation, transaction support
- `getMeetingById()` - Retrieve meeting metadata
- `getMeetingWithDetails()` - Retrieve with full attendee details and relationships
- `listMeetings()` - Paginated, filtered query with 6 filter options
- `updateMeeting()` - Update metadata with duration re-validation
- `sendInvites()` - Add additional attendees to existing meeting
- `respondToInvite()` - Accept/decline/tentative response with timestamp
- `getAttendeeStats()` - Count by response status
- `cancelMeeting()` - Delete meeting and all attendees
- `getUserUpcomingMeetings()` - Get future meetings for calendar display

**Meeting Filters:**

- By type (internal, client, team, one_on_one)
- By organizer
- By project
- By lead
- By search term (title/description)
- By time range (before/after)

**Time Validation Rules:**

- Minimum duration: 5 minutes
- Maximum duration: 8 hours
- End time must be after start time
- Automatic timezone support (ISO format)

### Controllers & Routing

**TaskController** (12 endpoints across 10 handlers)

```
POST   /api/v1/tasks                    - Create task
GET    /api/v1/tasks                    - List tasks (paginated, filtered)
GET    /api/v1/tasks/:id                - Get task details
PUT    /api/v1/tasks/:id                - Update task
POST   /api/v1/tasks/:id/complete       - Mark complete
POST   /api/v1/tasks/:id/mark-read      - Mark as read
POST   /api/v1/tasks/:id/comments       - Add comment
DELETE /api/v1/tasks/:id                - Cancel task
GET    /api/v1/tasks/stats/by-status    - Statistics
GET    /api/v1/tasks/overdue            - Overdue tasks
GET    /api/v1/tasks/my-assignments     - My assigned tasks
```

**MeetingController** (9 endpoints across 8 handlers)

```
POST   /api/v1/meetings                 - Create meeting
GET    /api/v1/meetings                 - List meetings (paginated, filtered)
GET    /api/v1/meetings/:id             - Get meeting details
PUT    /api/v1/meetings/:id             - Update meeting
POST   /api/v1/meetings/:id/invite      - Send additional invites
POST   /api/v1/meetings/:id/respond     - Respond to invitation
GET    /api/v1/meetings/:id/attendee-stats - Attendee stats
DELETE /api/v1/meetings/:id             - Cancel meeting
GET    /api/v1/meetings/upcoming/my-meetings - My upcoming meetings
```

---

## API Endpoints

### Task Endpoints

#### Create Task

```http
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Prepare proposal for ACME",
  "description": "Draft comprehensive proposal with pricing tiers",
  "priority": "high",
  "assigned_to_id": 8,
  "project_id": 1,
  "due_date": "2026-01-15"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "title": "Prepare proposal for ACME",
    "description": "Draft comprehensive proposal with pricing tiers",
    "priority": "high",
    "status": "todo",
    "assigned_to_id": 8,
    "assigned_by_id": 5,
    "project_id": 1,
    "lead_id": null,
    "due_date": "2026-01-15T00:00:00.000Z",
    "completed_at": null,
    "created_at": "2025-12-31T11:00:00.000Z",
    "updated_at": "2025-12-31T11:00:00.000Z",
    "assigned_to": {
      "id": 8,
      "name": "Sales Rep",
      "email": "rep@company.com"
    },
    "assigned_by": {
      "id": 5,
      "name": "Sales Manager",
      "email": "manager@company.com"
    },
    "project": {
      "id": 1,
      "name": "ACME Corp Project"
    },
    "lead": null,
    "read_by": [],
    "comments": []
  }
}
```

#### List Tasks

```http
GET /api/v1/tasks?status=todo&priority=high&assigned_to_id=8&page=1&pageSize=20
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

#### Get Task Details

```http
GET /api/v1/tasks/1
Authorization: Bearer <token>
```

#### Update Task

```http
PUT /api/v1/tasks/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "urgent",
  "due_date": "2026-01-10"
}
```

#### Mark Task Complete

```http
POST /api/v1/tasks/1/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "completed_at": "2025-12-31T14:30:00Z"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "completed",
    "completed_at": "2025-12-31T14:30:00.000Z"
  }
}
```

#### Mark Task as Read

```http
POST /api/v1/tasks/1/mark-read
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Task marked as read"
}
```

#### Add Task Comment

```http
POST /api/v1/tasks/1/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Customer approved the initial proposal. Moving to next phase."
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "task_id": 1,
    "user_id": 5,
    "comment": "Customer approved the initial proposal. Moving to next phase.",
    "created_at": "2025-12-31T11:05:00.000Z",
    "updated_at": "2025-12-31T11:05:00.000Z",
    "user": {
      "id": 5,
      "name": "Sales Manager",
      "email": "manager@company.com"
    }
  }
}
```

#### Get Overdue Tasks

```http
GET /api/v1/tasks/overdue?limit=10
Authorization: Bearer <token>
```

#### Get My Task Assignments

```http
GET /api/v1/tasks/my-assignments
Authorization: Bearer <token>
```

#### Get Task Statistics

```http
GET /api/v1/tasks/stats/by-status
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "todo": 5,
    "in_progress": 3,
    "completed": 2
  }
}
```

### Meeting Endpoints

#### Create Meeting

```http
POST /api/v1/meetings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Q1 Sales Strategy Review",
  "description": "Review Q1 targets and update strategy for Q2",
  "type": "team",
  "start_time": "2026-01-10T14:00:00Z",
  "end_time": "2026-01-10T15:30:00Z",
  "location": "Conference Room A",
  "attendee_ids": [5, 8, 9],
  "project_id": 1,
  "meeting_link": "https://meet.company.com/sales-q1-review"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "title": "Q1 Sales Strategy Review",
    "description": "Review Q1 targets and update strategy for Q2",
    "type": "team",
    "start_time": "2026-01-10T14:00:00.000Z",
    "end_time": "2026-01-10T15:30:00.000Z",
    "location": "Conference Room A",
    "organizer_id": 5,
    "project_id": 1,
    "lead_id": null,
    "meeting_link": "https://meet.company.com/sales-q1-review",
    "created_at": "2025-12-31T11:10:00.000Z",
    "updated_at": "2025-12-31T11:10:00.000Z",
    "organizer": {
      "id": 5,
      "name": "Sales Manager",
      "email": "manager@company.com"
    },
    "attendees": [
      {
        "id": 1,
        "meeting_id": 1,
        "user_id": 5,
        "status": "pending",
        "responded_at": null,
        "created_at": "2025-12-31T11:10:00.000Z",
        "user": {
          "id": 5,
          "name": "Sales Manager",
          "email": "manager@company.com"
        }
      },
      {
        "id": 2,
        "meeting_id": 1,
        "user_id": 8,
        "status": "pending",
        "responded_at": null,
        "created_at": "2025-12-31T11:10:00.000Z",
        "user": {
          "id": 8,
          "name": "Sales Rep",
          "email": "rep@company.com"
        }
      }
    ],
    "project": {
      "id": 1,
      "name": "ACME Corp Project"
    },
    "lead": null
  }
}
```

#### List Meetings

```http
GET /api/v1/meetings?type=team&start_after=2026-01-01&page=1&pageSize=20
Authorization: Bearer <token>
```

#### Get Meeting Details

```http
GET /api/v1/meetings/1
Authorization: Bearer <token>
```

#### Update Meeting

```http
PUT /api/v1/meetings/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": "Virtual Only",
  "meeting_link": "https://meet.company.com/q1-review-updated",
  "description": "Updated: now virtual meeting due to weather"
}
```

#### Send Additional Invites

```http
POST /api/v1/meetings/1/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "attendee_ids": [10, 11]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "meeting_id": 1,
      "user_id": 10,
      "status": "pending",
      "responded_at": null,
      "created_at": "2025-12-31T11:15:00.000Z",
      "user": {
        "id": 10,
        "name": "Finance Manager",
        "email": "finance@company.com"
      }
    }
  ]
}
```

#### Respond to Meeting Invitation

```http
POST /api/v1/meetings/1/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "accepted"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "meeting_id": 1,
    "user_id": 8,
    "status": "accepted",
    "responded_at": "2025-12-31T11:20:00.000Z",
    "created_at": "2025-12-31T11:10:00.000Z",
    "user": {
      "id": 8,
      "name": "Sales Rep",
      "email": "rep@company.com"
    }
  }
}
```

#### Get Attendee Statistics

```http
GET /api/v1/meetings/1/attendee-stats
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "pending": 1,
    "accepted": 2,
    "declined": 0,
    "tentative": 0
  }
}
```

#### Get My Upcoming Meetings

```http
GET /api/v1/meetings/upcoming/my-meetings?limit=10
Authorization: Bearer <token>
```

---

## Database Schema

### Tasks Table

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('todo', 'in_progress', 'completed', 'cancelled') DEFAULT 'todo',
  assigned_to_id INT,
  assigned_by_id INT NOT NULL,
  project_id INT,
  lead_id INT,
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (assigned_to_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),

  KEY idx_zone_id (zone_id),
  KEY idx_status (status),
  KEY idx_priority (priority),
  KEY idx_assigned_to_id (assigned_to_id),
  KEY idx_due_date (due_date),
  KEY idx_created_at (created_at)
);
```

### Task Read Status Table

```sql
CREATE TABLE task_read_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id),

  UNIQUE KEY uq_task_user (task_id, user_id),
  KEY idx_task_id (task_id)
);
```

### Task Comments Table

```sql
CREATE TABLE task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (user_id) REFERENCES users(id),

  KEY idx_task_id (task_id),
  KEY idx_created_at (created_at)
);
```

### Meetings Table

```sql
CREATE TABLE meetings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('internal', 'client', 'team', 'one_on_one') DEFAULT 'internal',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  organizer_id INT NOT NULL,
  project_id INT,
  lead_id INT,
  meeting_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (organizer_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id),

  KEY idx_zone_id (zone_id),
  KEY idx_type (type),
  KEY idx_start_time (start_time),
  KEY idx_organizer_id (organizer_id)
);
```

### Meeting Attendees Table

```sql
CREATE TABLE meeting_attendees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  meeting_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'tentative') DEFAULT 'pending',
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (meeting_id) REFERENCES meetings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),

  UNIQUE KEY uq_meeting_user (meeting_id, user_id),
  KEY idx_meeting_id (meeting_id),
  KEY idx_status (status)
);
```

---

## Type System

### Task Types

```typescript
enum TASK_PRIORITIES {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

enum TASK_STATUSES {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

interface Task {
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

interface TaskWithDetails extends Task {
  assigned_to?: UserRef;
  assigned_by?: UserRef;
  project?: ProjectRef;
  lead?: LeadRef;
  read_by?: TaskReadStatus[];
  comments?: TaskComment[];
}
```

### Meeting Types

```typescript
enum MEETING_TYPES {
  INTERNAL = "internal",
  CLIENT = "client",
  TEAM = "team",
  ONE_ON_ONE = "one_on_one",
}

enum ATTENDEE_STATUS {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  TENTATIVE = "tentative",
}

interface Meeting {
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

interface MeetingWithDetails extends Meeting {
  organizer?: UserRef;
  attendees?: MeetingAttendee[];
  project?: ProjectRef;
  lead?: LeadRef;
}

interface MeetingAttendee {
  id: number;
  meeting_id: number;
  user_id: number;
  status: ATTENDEE_STATUS;
  responded_at: Date | null;
  created_at: Date;
  user?: UserRef;
}
```

All types defined in: [src/plugins/tasks/types.ts](src/plugins/tasks/types.ts)

---

## Directory Structure

```
src/plugins/tasks/
├── services/
│   ├── task.service.ts        (700+ lines)
│   └── meeting.service.ts     (700+ lines)
├── controllers/
│   ├── task.controller.ts     (400+ lines)
│   └── meeting.controller.ts  (350+ lines)
├── middleware/                (reserved for future)
├── types.ts                   (250+ lines)
└── routes.ts                  (180+ lines)
```

### Service Layer

**TaskService**: Complete task lifecycle management

- CRUD operations with validation
- Read/unread status tracking
- Comment management
- Overdue detection
- User-specific queries

**MeetingService**: Full meeting scheduling and RSVP

- Meeting creation with time validation
- Attendee management
- RSVP response handling
- Attendee statistics
- Upcoming meetings queries

### Controller Layer

**TaskController**: HTTP handlers for task endpoints

- Input validation
- Permission checking
- Pagination support
- Comprehensive error handling

**MeetingController**: HTTP handlers for meeting endpoints

- Time format validation
- Attendee invitation management
- RSVP response handling
- Proper HTTP status codes

---

## Security & Permissions

### Required Capabilities

**Task Operations:**

- `task:create` - Create new tasks
- `task:update` - Update task metadata and completion
- `task:delete` - Cancel tasks

**Meeting Operations:**

- `meeting:create` - Create new meetings
- `meeting:update` - Update meeting metadata
- `meeting:invite` - Send additional invites
- `meeting:delete` - Cancel meetings

### Zone Isolation

All operations are strictly zone-based:

- Tasks belong to a specific zone
- Can only assign to users in same zone
- Project/lead references must be same zone
- Meetings must include attendees from same zone

### Audit Logging

All create/update/delete operations logged:

- User ID and timestamp
- Old and new values
- Entity type and ID
- Zone attribution

### Read/Unread Tracking

Task read status used for:

- Notification systems
- Identifying new assignments
- Tracking awareness of updates

---

## Testing Guide

### Prerequisites

```bash
# Start server
npm run dev

# Ensure database is migrated
npm run migrate
```

### Task Tests

#### 1. Create a Task

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review proposal",
    "description": "Check ACME proposal",
    "priority": "high",
    "assigned_to_id": 8,
    "due_date": "2026-01-15"
  }'
```

**Expected Response:** `201 Created` with task object

#### 2. List Tasks with Filtering

```bash
curl "http://localhost:3000/api/v1/tasks?status=todo&priority=high&overdue_only=false" \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with paginated task list

#### 3. Mark Task as Complete

```bash
curl -X POST http://localhost:3000/api/v1/tasks/1/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "completed_at": "2025-12-31T14:30:00Z"
  }'
```

**Expected Response:** `200 OK` with updated task (status=completed)

#### 4. Add Task Comment

```bash
curl -X POST http://localhost:3000/api/v1/tasks/1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Reviewed and approved by customer"
  }'
```

**Expected Response:** `201 Created` with comment object

#### 5. Get Overdue Tasks

```bash
curl "http://localhost:3000/api/v1/tasks/overdue?limit=10" \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with overdue task list

### Meeting Tests

#### 1. Create a Meeting

```bash
curl -X POST http://localhost:3000/api/v1/meetings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q1 Sales Review",
    "type": "team",
    "start_time": "2026-01-10T14:00:00Z",
    "end_time": "2026-01-10T15:30:00Z",
    "location": "Conference Room A",
    "attendee_ids": [5, 8, 9]
  }'
```

**Expected Response:** `201 Created` with meeting object and attendees array

#### 2. Send Additional Invites

```bash
curl -X POST http://localhost:3000/api/v1/meetings/1/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "attendee_ids": [10]
  }'
```

**Expected Response:** `201 Created` with newly added attendees

#### 3. Respond to Invitation

```bash
curl -X POST http://localhost:3000/api/v1/meetings/1/respond \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted"
  }'
```

**Expected Response:** `200 OK` with updated attendee record (status=accepted, responded_at=now)

#### 4. Get Attendee Stats

```bash
curl http://localhost:3000/api/v1/meetings/1/attendee-stats \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with counts:

```json
{
  "pending": 1,
  "accepted": 2,
  "declined": 0,
  "tentative": 0
}
```

#### 5. Get My Upcoming Meetings

```bash
curl "http://localhost:3000/api/v1/meetings/upcoming/my-meetings?limit=10" \
  -H "Authorization: Bearer <token>"
```

**Expected Response:** `200 OK` with future meetings for current user

---

## Verification Checklist

- [ ] **Task Creation**

  - [x] POST /api/v1/tasks with all fields
  - [x] Validates title not empty
  - [x] Validates priority enum
  - [x] Validates assigned user in zone
  - [x] Validates project belongs to zone
  - [x] Validates due_date format
  - [x] Returns 201 with task object

- [ ] **Task Querying**

  - [x] GET /api/v1/tasks lists all tasks
  - [x] Filters by status, priority, assigned_to_id
  - [x] Filters by project_id, lead_id, search
  - [x] Supports due date range filters
  - [x] Supports overdue_only flag
  - [x] Pagination with default 20, max 100

- [ ] **Task Updates**

  - [x] PUT /api/v1/tasks/:id updates metadata
  - [x] POST /api/v1/tasks/:id/complete marks done
  - [x] POST /api/v1/tasks/:id/mark-read tracks read status
  - [x] POST /api/v1/tasks/:id/comments adds comments
  - [x] Comments include user details

- [ ] **Task Lifecycle**

  - [x] Task read status tracked per user
  - [x] Comments returned in task details
  - [x] Overdue detection working
  - [x] Statistics aggregation by status
  - [x] Soft deletes (cancelled status)

- [ ] **Meeting Creation**

  - [x] POST /api/v1/meetings creates with attendees
  - [x] Validates meeting time 5 min to 8 hours
  - [x] Validates end_time > start_time
  - [x] Validates 1-100 attendees
  - [x] Validates all attendees in zone
  - [x] Atomic transaction (meeting + attendees)

- [ ] **Meeting Management**

  - [x] GET /api/v1/meetings lists all meetings
  - [x] Filters by type, organizer, time range
  - [x] Pagination support
  - [x] PUT /api/v1/meetings/:id updates metadata
  - [x] POST /api/v1/meetings/:id/invite adds attendees
  - [x] Prevents duplicate attendees

- [ ] **RSVP Management**

  - [x] POST /api/v1/meetings/:id/respond handles RSVP
  - [x] Validates attendee status enum
  - [x] Records responded_at timestamp
  - [x] GET /api/v1/meetings/:id/attendee-stats works
  - [x] Upcoming meetings for calendar display

- [ ] **Permissions**

  - [x] All endpoints require authentication
  - [x] task:create required for POST /tasks
  - [x] task:update required for PUT/POST complete
  - [x] meeting:create required for POST /meetings
  - [x] meeting:invite required for invite endpoints
  - [x] Returns 403 for unauthorized

- [ ] **Data Integrity**

  - [x] Zone isolation enforced
  - [x] Foreign key constraints on database
  - [x] Read status unique per task/user
  - [x] Soft deletes for tasks

- [ ] **Audit Trail**
  - [x] All creates logged
  - [x] All updates logged
  - [x] RSVP responses logged
  - [x] Comments tracked

---

## Troubleshooting

### "Assigned user not found in this zone"

**Cause:** Trying to assign task to user not in zone  
**Solution:** Only assign to users who are members of the zone

### "Task not found"

**Cause:** Task ID doesn't exist or belongs to different zone  
**Solution:** Verify task ID and that it belongs to your zone

### "Meeting duration must be at least 5 minutes"

**Cause:** End time too close to start time  
**Solution:** Ensure meeting duration is >= 5 minutes

### "All attendees are already invited"

**Cause:** Trying to invite users already attending  
**Solution:** Only invite new attendees not already invited

### Comments not showing

**Cause:** Comments are empty initially  
**Solution:** Comments appear after first comment is added

### Read status not tracking

**Cause:** Need to explicitly mark as read  
**Solution:** Call POST /tasks/:id/mark-read to track read status

---

## Business Rules & Best Practices

1. **Task Completion**: Mark tasks complete with actual completion timestamp
2. **Priority Ordering**: Tasks list ordered by priority DESC then due_date ASC
3. **Overdue Detection**: Automatic for past due dates with non-completed status
4. **Meeting Duration**: Enforced between 5 minutes and 8 hours
5. **Attendee Validation**: All meeting attendees must be in same zone
6. **RSVP Timeline**: Attendees can respond anytime before/after meeting
7. **Soft Deletes**: Cancelled tasks/meetings retained for audit trail
8. **Read Status**: One read status per task per user

---

## Performance Considerations

- **Task Queries**: Indexed on zone_id, status, priority, due_date
- **Meeting Queries**: Indexed on zone_id, type, start_time, organizer_id
- **Pagination**: Default 20 per page, max 100 to limit dataset size
- **Lazy Loading**: Comments and read status loaded on-demand
- **Aggregation**: Stats queries optimized with COUNT(\*) GROUP BY

---

## Next Steps

**Phase 5 – Pricing & Reporting** will build on existing modules by adding:

- Zone-wise price lists with audit trails
- Daily closing reports with KPI calculations
- Sales metrics and dashboards
- Export functionality (PDF, CSV, Excel)
- Revenue tracking and forecasting

See: [Master Plan Overview](#master-plan---zone-based-internal-crm)
