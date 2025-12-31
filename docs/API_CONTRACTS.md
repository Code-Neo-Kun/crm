# 📡 API Contracts – Zone-Based CRM

**Version:** 1.0  
**Status:** Step 4 Foundation  
**Last Updated:** 2025-12-31

---

## Overview

All APIs follow **REST** conventions with:

- JSON request/response
- Proper HTTP status codes
- Zone filtering applied by default
- Comprehensive error handling

---

## 1. Core Response Format

### **Success Response**

```json
{
  "success": true,
  "data": {}, // Response data
  "meta": {
    "timestamp": "2025-12-31T10:30:45Z",
    "requestId": "uuid-here",
    "version": "1.0"
  }
}
```

### **Error Response**

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action",
    "statusCode": 403,
    "details": {}
  },
  "meta": {
    "timestamp": "2025-12-31T10:30:45Z",
    "requestId": "uuid-here"
  }
}
```

---

## 2. Authentication APIs

### **POST /auth/login**

Login with credentials

**Request:**

```json
{
  "username": "john@company.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john@company.com",
      "firstName": "John",
      "email": "john@company.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "zones": [{ "id": 1, "name": "Gujarat", "role": "manager" }],
    "primaryZone": 1
  }
}
```

**Error (401):**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "statusCode": 401
  }
}
```

---

### **POST /auth/logout**

Invalidate session

**Request:** (headers only, no body)

```
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### **POST /auth/refresh**

Refresh JWT token

**Request:** (headers only)

```
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token"
  }
}
```

---

## 3. User Management APIs

### **GET /users/:userId**

Get user details

**Request:** (headers only)

```
Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@company.com",
    "phone": "+91 9876543210",
    "isActive": true,
    "zones": [
      {
        "id": 1,
        "name": "Gujarat",
        "role": "manager",
        "isPrimary": true
      },
      {
        "id": 5,
        "name": "Ahmedabad Branch",
        "role": "staff",
        "isPrimary": false
      }
    ],
    "capabilities": [
      "lead.create",
      "lead.read",
      "lead.assign",
      "project.create"
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

---

### **PUT /users/:userId**

Update user details (Super Admin / Zone Admin only)

**Request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+91 9876543211",
  "isActive": true
}
```

**Response (200):** Updated user object (same as GET)

---

### **POST /users**

Create new user (Super Admin only)

**Request:**

```json
{
  "username": "jane@company.com",
  "email": "jane@company.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "initialPassword123",
  "phone": "+91 9876543211",
  "zones": [
    { "zoneId": 1, "role": "staff" },
    { "zoneId": 5, "role": "manager" }
  ],
  "primaryZoneId": 1
}
```

**Response (201):** User object with zones

---

## 4. Zone Management APIs

### **GET /zones**

List all zones with hierarchy (filtered by user's accessible zones for non-admins)

**Request:**

```
Authorization: Bearer {token}
```

**Query Params:**

```
?parentId=1           (optional, filter by parent)
?level=branch         (optional, filter by level)
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "IND",
      "name": "India",
      "level": "root",
      "parentId": null,
      "children": [
        {
          "id": 2,
          "code": "GJ",
          "name": "Gujarat",
          "level": "region",
          "parentId": 1,
          "children": [
            {
              "id": 3,
              "code": "ABD",
              "name": "Ahmedabad",
              "level": "branch",
              "parentId": 2,
              "children": [
                {
                  "id": 4,
                  "code": "ABD_EAST",
                  "name": "East Team",
                  "level": "team",
                  "parentId": 3,
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

### **GET /zones/:zoneId**

Get zone details

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "IND",
    "name": "India",
    "level": "root",
    "parentId": null,
    "metadata": {
      "description": "Headquarters",
      "headCount": 50
    },
    "childCount": 1,
    "userCount": 12,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

---

### **POST /zones**

Create zone (Super Admin only)

**Request:**

```json
{
  "code": "GJ",
  "name": "Gujarat",
  "level": "region",
  "parentId": 1,
  "metadata": {
    "description": "Gujarat Region"
  }
}
```

**Response (201):** Zone object

---

## 5. Lead Management APIs

### **GET /leads**

List leads (zone-filtered)

**Request:** (headers only)

```
Authorization: Bearer {token}
```

**Query Params:**

```
?zoneId=1              (optional, single zone - auto-filtered if not provided)
?status=contacted      (optional, filter by status)
?owner=42              (optional, filter by owner)
?sortBy=created_at     (optional, default: created_at)
?sortOrder=DESC        (optional, default: DESC)
?page=1                (optional, default: 1)
?pageSize=20           (optional, default: 20)
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "zoneId": 1,
      "companyName": "Acme Corp",
      "contactName": "John Smith",
      "email": "john@acme.com",
      "phone": "+91 9876543210",
      "status": "contacted",
      "ownerId": 42,
      "ownerName": "Jane Doe",
      "createdById": 1,
      "source": "referral",
      "value": 50000.0,
      "currency": "INR",
      "notes": "High-potential lead",
      "createdAt": "2025-12-15T10:00:00Z",
      "updatedAt": "2025-12-30T15:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "pages": 8
  }
}
```

---

### **GET /leads/:leadId**

Get lead details with activity timeline

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "zoneId": 1,
    "companyName": "Acme Corp",
    "contactName": "John Smith",
    "email": "john@acme.com",
    "phone": "+91 9876543210",
    "status": "contacted",
    "ownerId": 42,
    "ownerName": "Jane Doe",
    "createdById": 1,
    "source": "referral",
    "value": 50000.0,
    "currency": "INR",
    "notes": "High-potential lead",
    "activities": [
      {
        "id": 1,
        "type": "call",
        "description": "Discussed pricing",
        "performedBy": "Jane Doe",
        "createdAt": "2025-12-30T15:30:00Z"
      }
    ],
    "createdAt": "2025-12-15T10:00:00Z",
    "updatedAt": "2025-12-30T15:30:00Z"
  }
}
```

---

### **POST /leads**

Create new lead (auto-assigns to current zone)

**Request:**

```json
{
  "companyName": "New Corp",
  "contactName": "Alice Johnson",
  "email": "alice@newcorp.com",
  "phone": "+91 9876543212",
  "source": "linkedin",
  "value": 75000.0,
  "currency": "INR",
  "notes": "Enterprise customer potential"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "zoneId": 1, // Auto-assigned to user's primary zone
    "companyName": "New Corp",
    "contactName": "Alice Johnson",
    "email": "alice@newcorp.com",
    "phone": "+91 9876543212",
    "status": "new",
    "ownerId": null, // Unassigned initially
    "createdById": 42,
    "source": "linkedin",
    "value": 75000.0,
    "currency": "INR",
    "notes": "Enterprise customer potential",
    "createdAt": "2025-12-31T10:30:45Z",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

---

### **PUT /leads/:leadId**

Update lead

**Request:**

```json
{
  "status": "interested",
  "value": 80000.0,
  "notes": "Updated after call"
}
```

**Response (200):** Updated lead object

**Possible Errors:**

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Only lead owner or zone admin can edit",
    "statusCode": 403
  }
}
```

---

### **POST /leads/:leadId/assign**

Assign lead to user (within same zone only)

**Request:**

```json
{
  "newOwnerId": 45
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 100,
    "ownerId": 45,
    "ownerName": "New Owner Name",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

**Error (403):** If target user not in same zone

```json
{
  "success": false,
  "error": {
    "code": "ZONE_MISMATCH",
    "message": "Target user is not in the same zone",
    "statusCode": 403
  }
}
```

---

### **POST /leads/:leadId/activities**

Add activity (call, email, note, etc.)

**Request:**

```json
{
  "type": "call",
  "description": "Discussed pricing and delivery timeline"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "type": "call",
    "description": "Discussed pricing and delivery timeline",
    "performedBy": "Jane Doe",
    "performedById": 42,
    "createdAt": "2025-12-31T10:30:45Z"
  }
}
```

---

## 6. Project Management APIs

### **GET /projects**

List projects (zone-filtered)

**Query Params:**

```
?zoneId=1              (auto-filtered if not provided)
?status=execution      (optional, filter by status)
?pipelineId=5          (optional, filter by pipeline)
?owner=42              (optional, filter by owner)
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "zoneId": 1,
      "leadId": 100,
      "name": "Acme Corp - Phase 1",
      "status": "execution",
      "pipelineId": 5,
      "currentStageName": "Execution",
      "ownerId": 42,
      "ownerName": "Jane Doe",
      "startDate": "2025-12-01",
      "endDate": "2025-12-31",
      "budget": 100000.0,
      "currency": "INR",
      "createdAt": "2025-12-01T00:00:00Z",
      "updatedAt": "2025-12-31T10:30:45Z"
    }
  ]
}
```

---

### **POST /projects**

Create project (from lead or standalone)

**Request:**

```json
{
  "name": "New Corp - Implementation",
  "leadId": 101,          (optional, link to lead)
  "pipelineId": 5,        (required)
  "owner": 45,            (required, must be in same zone)
  "startDate": "2025-12-31",
  "endDate": "2026-01-31",
  "budget": 120000.00
}
```

**Response (201):** Project object

---

### **POST /projects/:projectId/transition**

Move project to next stage (server validates stage workflow)

**Request:**

```json
{
  "newStageId": 10,
  "notes": "All requirements met, proceeding to execution"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "status": "execution",
    "currentStageId": 10,
    "currentStageName": "Execution",
    "transitionedAt": "2025-12-31T10:30:45Z"
  }
}
```

---

## 7. Task Management APIs

### **GET /tasks**

List tasks assigned to user

**Query Params:**

```
?status=open           (optional, default: open,in_progress)
?relatedTo=lead        (optional, filter by related entity type)
?dueDateFrom=2025-12-31 (optional)
?dueDateTo=2026-01-31   (optional)
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 200,
      "zoneId": 1,
      "title": "Follow up with Acme Corp",
      "description": "Call to discuss proposal",
      "assignedToId": 42,    (current user)
      "assignedById": 1,
      "status": "open",
      "priority": "high",
      "dueDate": "2025-12-31",
      "relatedToType": "lead",
      "relatedToId": 100,
      "relatedToName": "Acme Corp",
      "isRead": true,
      "createdAt": "2025-12-30T10:00:00Z",
      "updatedAt": "2025-12-31T10:30:45Z",
      "completedAt": null
    }
  ]
}
```

---

### **POST /tasks**

Create task

**Request:**

```json
{
  "title": "Send proposal",
  "description": "Send detailed proposal to client",
  "assignToId": 45,       (must be in same zone)
  "priority": "high",
  "dueDate": "2026-01-05",
  "relatedToType": "lead",
  "relatedToId": 100
}
```

**Response (201):** Task object

---

### **PUT /tasks/:taskId**

Update task (only by assignee or assigner)

**Request:**

```json
{
  "status": "completed"
}
```

**Response (200):** Updated task object

---

### **PUT /tasks/:taskId/read**

Mark task as read

**Request:** (no body, headers only)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 200,
    "isRead": true
  }
}
```

---

## 8. Meeting Management APIs

### **GET /meetings**

List meetings (user as organizer or attendee)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 300,
      "zoneId": 1,
      "title": "Quarterly Business Review",
      "description": "Q4 2025 review with clients",
      "organizerId": 42,
      "organizerName": "Jane Doe",
      "scheduledStart": "2025-12-31T14:00:00Z",
      "scheduledEnd": "2025-12-31T15:00:00Z",
      "location": "Conference Room A",
      "meetingLink": "https://meet.google.com/...",
      "status": "scheduled",
      "attendees": [
        {
          "id": 42,
          "name": "Jane Doe",
          "status": "accepted"
        },
        {
          "id": 45,
          "name": "John Smith",
          "status": "pending"
        }
      ],
      "createdAt": "2025-12-30T10:00:00Z",
      "updatedAt": "2025-12-31T10:30:45Z"
    }
  ]
}
```

---

### **POST /meetings**

Create meeting

**Request:**

```json
{
  "title": "Sales Sync",
  "description": "Weekly sales update",
  "scheduledStart": "2025-12-31T14:00:00Z",
  "scheduledEnd": "2025-12-31T14:30:00Z",
  "attendeeIds": [42, 45, 48],  (must all be in same zone)
  "location": "Virtual",
  "meetingLink": "https://meet.google.com/xyz",
  "relatedToType": "lead",
  "relatedToId": 100
}
```

**Response (201):** Meeting object

**Error (403):** If attendee not in same zone

---

### **POST /meetings/:meetingId/respond**

Accept/decline meeting invite

**Request:**

```json
{
  "status": "accepted" // or "declined", "tentative"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 300,
    "attendeeStatus": "accepted"
  }
}
```

---

## 9. Pricing APIs

### **GET /price-lists**

List price lists (zone-filtered)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 50,
      "zoneId": 1,
      "name": "Standard 2025",
      "description": "Standard pricing for India region",
      "currency": "INR",
      "validFrom": "2025-01-01",
      "validTo": "2025-12-31",
      "isActive": true,
      "itemCount": 25,
      "createdById": 1,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-12-31T10:30:45Z"
    }
  ]
}
```

---

### **GET /price-lists/:priceListId**

Get price list with items

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 50,
    "zoneId": 1,
    "name": "Standard 2025",
    "description": "Standard pricing for India region",
    "currency": "INR",
    "validFrom": "2025-01-01",
    "validTo": "2025-12-31",
    "isActive": true,
    "items": [
      {
        "id": 101,
        "productCode": "PROD_001",
        "productName": "Service A",
        "unitPrice": 5000.0,
        "currency": "INR",
        "applicableFrom": "2025-01-01",
        "applicableTo": "2025-12-31",
        "isActive": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

---

### **POST /price-lists**

Create price list (Zone Admin only)

**Request:**

```json
{
  "name": "Premium 2025",
  "description": "Premium tier pricing",
  "currency": "INR",
  "validFrom": "2025-01-01",
  "validTo": "2025-12-31"
}
```

**Response (201):** Price list object

---

### **POST /price-lists/:priceListId/items**

Add item to price list

**Request:**

```json
{
  "productCode": "PROD_002",
  "productName": "Service B",
  "unitPrice": 7500.0,
  "applicableFrom": "2025-01-01",
  "applicableTo": "2025-12-31"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": 102,
    "productCode": "PROD_002",
    "productName": "Service B",
    "unitPrice": 7500.0,
    "currency": "INR",
    "applicableFrom": "2025-01-01",
    "applicableTo": "2025-12-31",
    "isActive": true,
    "createdAt": "2025-12-31T10:30:45Z"
  }
}
```

---

### **PUT /price-lists/:priceListId/items/:itemId**

Update price item (logged in pricing_audit)

**Request:**

```json
{
  "unitPrice": 8000.0
}
```

**Response (200):** Updated item

---

## 10. Reporting APIs

### **GET /reports/daily-closing**

Get daily closing reports (zone-filtered)

**Query Params:**

```
?zoneId=1
?reportDate=2025-12-31
?from=2025-12-01
?to=2025-12-31
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "zoneId": 1,
      "zoneName": "Gujarat",
      "reportDate": "2025-12-31",
      "totalLeads": 150,
      "newLeads": 5,
      "leadsContacted": 45,
      "leadsConverted": 3,
      "totalProjects": 20,
      "completedProjects": 2,
      "onTimeProjects": 2,
      "totalRevenue": 500000.0,
      "achievedTarget": 85.5,
      "submittedById": 42,
      "submittedByName": "Jane Doe",
      "submittedAt": "2025-12-31T23:59:00Z",
      "createdAt": "2025-12-31T23:59:00Z"
    }
  ]
}
```

---

### **POST /reports/daily-closing/submit**

Submit daily closing report

**Request:**

```json
{
  "reportDate": "2025-12-31",
  "totalLeads": 150,
  "newLeads": 5,
  "leadsContacted": 45,
  "leadsConverted": 3,
  "totalProjects": 20,
  "completedProjects": 2,
  "onTimeProjects": 2,
  "totalRevenue": 500000.0,
  "achievedTarget": 85.5
}
```

**Response (201):** Report object

---

### **GET /reports/export**

Export report as CSV or PDF

**Query Params:**

```
?format=csv            (or pdf)
?type=daily_closing    (or performance, kpi, etc.)
?from=2025-12-01
?to=2025-12-31
?zoneId=1              (auto-filtered)
```

**Response (200):** Binary file (CSV/PDF)

---

## 11. Standard Error Codes

| Code                  | HTTP | Meaning                 |
| --------------------- | ---- | ----------------------- |
| `INVALID_CREDENTIALS` | 401  | Login failed            |
| `EXPIRED_TOKEN`       | 401  | JWT token expired       |
| `UNAUTHORIZED`        | 401  | Not authenticated       |
| `PERMISSION_DENIED`   | 403  | Lacking capability      |
| `ZONE_MISMATCH`       | 403  | Cross-zone violation    |
| `NOT_FOUND`           | 404  | Resource not found      |
| `VALIDATION_ERROR`    | 400  | Invalid input           |
| `CONFLICT`            | 409  | Resource already exists |
| `INTERNAL_ERROR`      | 500  | Server error            |

---

## 12. Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1735694445
```

---

## 13. Next Steps

1. ✅ Data Model (Step 1)
2. ✅ Permission Matrix (Step 2)
3. ✅ Plugin Architecture (Step 3)
4. ✅ API Contracts (Step 4)
5. → Phase 1: System Core Implementation

---

## 14. API Versioning Strategy

All endpoints prefixed with `/api/v1/`

Future versions use `/api/v2/`, `/api/v3/`, etc.

Backward compatibility maintained for 2+ versions.
