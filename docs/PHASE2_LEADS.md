# 📊 Phase 2 - Lead Management: Implementation Guide

**Status:** Complete Implementation  
**Created:** 2025-12-31  
**Version:** 1.0.0

---

## ✅ What's Implemented

**Phase 2 - Lead Management includes:**

### Lead CRUD Operations

- ✅ Create lead (auto-assigns to user's primary zone)
- ✅ Read lead (with full details and activity timeline)
- ✅ Update lead (company name, contact, status, value, notes)
- ✅ Delete lead (with audit logging)
- ✅ List leads (with pagination, filtering, sorting)

### Lead Assignment

- ✅ Assign lead to user (validates same-zone requirement)
- ✅ Audit trail for ownership changes
- ✅ Activity logging for assignments

### Activity Timeline

- ✅ Track activities (calls, emails, meetings, notes, status changes, assignments)
- ✅ Activity history per lead
- ✅ User attribution for each activity

### Zone-Based Access Control

- ✅ Leads tied to specific zone
- ✅ Cross-zone access prevention
- ✅ Zone-specific lead filtering
- ✅ Zone admin can see all leads in zone

### Permissions

- ✅ `lead.create` - Create new leads
- ✅ `lead.read` - View leads
- ✅ `lead.edit` - Edit lead details
- ✅ `lead.assign` - Reassign lead ownership
- ✅ `lead.delete` - Delete leads

### Audit & Logging

- ✅ All CRUD operations logged
- ✅ Assignment changes tracked
- ✅ Activity timeline immutable
- ✅ Access denial logging

---

## 📡 API Endpoints

### Create Lead

```bash
POST /api/v1/leads
Authorization: Bearer {token}
Content-Type: application/json

{
  "companyName": "Acme Corp",
  "contactName": "John Smith",
  "email": "john@acme.com",
  "phone": "+91 9876543210",
  "source": "linkedin",
  "value": 50000,
  "notes": "High-potential lead"
}

# Response (201):
{
  "success": true,
  "data": {
    "id": 1,
    "zoneId": 1,
    "companyName": "Acme Corp",
    "contactName": "John Smith",
    "email": "john@acme.com",
    "phone": "+91 9876543210",
    "status": "new",
    "ownerId": null,
    "createdById": 42,
    "source": "linkedin",
    "value": 50000,
    "currency": "INR",
    "notes": "High-potential lead",
    "createdAt": "2025-12-31T10:30:45Z",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

### List Leads

```bash
GET /api/v1/leads?zoneId=1&status=new&owner=42&search=acme&page=1&pageSize=20
Authorization: Bearer {token}

# Response (200):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "zoneId": 1,
      "companyName": "Acme Corp",
      "contactName": "John Smith",
      "email": "john@acme.com",
      "phone": "+91 9876543210",
      "status": "new",
      "ownerId": null,
      "createdById": 42,
      "source": "linkedin",
      "value": 50000,
      "currency": "INR",
      "notes": "High-potential lead",
      "ownerName": "Unassigned",
      "createdAt": "2025-12-31T10:30:45Z",
      "updatedAt": "2025-12-31T10:30:45Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "pages": 8,
    "timestamp": "2025-12-31T10:30:45Z",
    "requestId": "uuid-here"
  }
}
```

### Get Lead Details

```bash
GET /api/v1/leads/1?zoneId=1
Authorization: Bearer {token}

# Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "zoneId": 1,
    "companyName": "Acme Corp",
    "contactName": "John Smith",
    "email": "john@acme.com",
    "phone": "+91 9876543210",
    "status": "contacted",
    "ownerId": 42,
    "ownerName": "Jane Doe",
    "createdById": 1,
    "createdByName": "Admin",
    "source": "linkedin",
    "value": 50000,
    "currency": "INR",
    "notes": "High-potential lead",
    "activities": [
      {
        "id": 1,
        "leadId": 1,
        "type": "call",
        "description": "Initial call - discussed requirements",
        "performedById": 42,
        "performedByName": "Jane Doe",
        "createdAt": "2025-12-30T14:00:00Z"
      },
      {
        "id": 2,
        "leadId": 1,
        "type": "status_change",
        "description": "Status changed from new to contacted",
        "performedById": 42,
        "performedByName": "Jane Doe",
        "createdAt": "2025-12-30T14:05:00Z"
      }
    ],
    "createdAt": "2025-12-30T10:00:00Z",
    "updatedAt": "2025-12-30T14:05:00Z"
  }
}
```

### Update Lead

```bash
PUT /api/v1/leads/1?zoneId=1
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "interested",
  "value": 75000,
  "notes": "Updated after follow-up call"
}

# Response (200): Updated lead object
```

### Assign Lead

```bash
POST /api/v1/leads/1/assign?zoneId=1
Authorization: Bearer {token}
Content-Type: application/json

{
  "newOwnerId": 45
}

# Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "zoneId": 1,
    ...
    "ownerId": 45,
    "ownerName": "New Owner Name",
    "updatedAt": "2025-12-31T10:30:45Z"
  }
}
```

### Add Activity

```bash
POST /api/v1/leads/1/activities?zoneId=1
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "call",
  "description": "Discussed pricing and delivery timeline"
}

# Response (201):
{
  "success": true,
  "data": {
    "id": 3,
    "leadId": 1,
    "type": "call",
    "description": "Discussed pricing and delivery timeline",
    "performedById": 42,
    "performedByName": "Jane Doe",
    "createdAt": "2025-12-31T10:30:45Z"
  }
}
```

---

## 🏗️ Directory Structure

```
src/plugins/leads/
├── services/
│   └── lead.service.ts          # Lead CRUD operations
├── controllers/
│   └── lead.controller.ts       # API request handlers
├── types.ts                     # TypeScript interfaces
└── routes.ts                    # Express routes

Integrated into:
├── src/app.ts                   # Lead routes registered
└── src/server.ts                # (No changes needed)
```

---

## 🔐 Security Features

1. **Zone-Based Access Control** - Leads tied to zones, cross-zone access denied
2. **Permission Checks** - All operations verified against user capabilities
3. **Audit Logging** - All CRUD operations logged with user attribution
4. **Activity Immutability** - Activity timeline cannot be modified
5. **Ownership Validation** - Assignments verified for same-zone users
6. **Access Denial Logging** - Cross-zone attempts logged for security monitoring

---

## 📊 Database Tables Used

### `leads`

- `id` - Primary key
- `zone_id` - Zone ownership (FK)
- `company_name` - Company name
- `contact_name` - Contact person
- `email` - Contact email
- `phone` - Contact phone
- `status` - Lead status (new, contacted, interested, proposal, won, lost)
- `owner_id` - Assigned user (FK)
- `created_by_id` - Creator user (FK)
- `source` - Lead source
- `value` - Estimated deal value
- `currency` - Currency code
- `notes` - Notes
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### `lead_activities`

- `id` - Primary key
- `lead_id` - Lead reference (FK)
- `activity_type` - Type (call, email, meeting, note, status_change, assignment)
- `description` - Activity description
- `performed_by_id` - User who performed activity (FK)
- `created_at` - Activity timestamp

---

## 🧪 Testing Phase 2

### 1. Create Lead

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Corp",
    "contactName": "Test Contact",
    "email": "test@testcorp.com",
    "source": "direct"
  }'
```

### 2. List Leads

```bash
curl -X GET "http://localhost:3000/api/v1/leads?zoneId=1&page=1&pageSize=10" \
  -H "Authorization: Bearer {token}"
```

### 3. Get Lead with Activities

```bash
curl -X GET "http://localhost:3000/api/v1/leads/1?zoneId=1" \
  -H "Authorization: Bearer {token}"
```

### 4. Update Lead

```bash
curl -X PUT "http://localhost:3000/api/v1/leads/1?zoneId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "contacted",
    "value": 60000
  }'
```

### 5. Add Activity

```bash
curl -X POST "http://localhost:3000/api/v1/leads/1/activities?zoneId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call",
    "description": "Initial client call"
  }'
```

### 6. Assign Lead

```bash
curl -X POST "http://localhost:3000/api/v1/leads/1/assign?zoneId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "newOwnerId": 2
  }'
```

---

## ✅ Phase 2 Verification Checklist

- [ ] Lead routes mounted in app.ts
- [ ] Create lead endpoint returns 201
- [ ] List leads returns paginated results
- [ ] Get lead returns details with activities
- [ ] Update lead modifies fields and logs audit
- [ ] Assign lead validates same-zone requirement
- [ ] Add activity creates immutable timeline
- [ ] Cross-zone access returns 403 Forbidden
- [ ] Audit logs show all CRUD operations
- [ ] Permissions enforced (lead.create, lead.read, etc.)
- [ ] Status validation prevents invalid statuses

---

## 📋 Next Steps

After Phase 2 is verified:

1. **Phase 3** - Pipelines & Projects (Kanban, stage transitions, project conversion from lead)
2. **Phase 4** - Tasks & Assignments (Task CRUD, assignment, read tracking)
3. **Phase 5** - Meetings & Calendar (Scheduling, invitations, notes)
4. **Phase 6** - Pricing (Zone-wise price lists, audit trail)
5. **Phase 7** - Reporting (KPIs, daily closing, exports)

---

## 📞 Troubleshooting

### 403 ZONE_MISMATCH

- User trying to access lead in zone they don't belong to
- Check user's zones via GET /api/v1/auth/me
- Use correct zoneId in request

### 403 PERMISSION_DENIED

- User lacks required capability (lead.create, lead.edit, lead.assign)
- Check user's role and capabilities
- Ensure role has capability assigned

### 404 NOT_FOUND

- Lead doesn't exist in specified zone
- Check lead ID and zone ID are correct
- Verify lead wasn't deleted

### 400 VALIDATION_ERROR

- Required fields missing or invalid
- Check request body matches schema
- Verify status values are valid

---

## 📈 Performance Considerations

- Pagination default: 20 per page (configurable)
- Indexes on: zone_id, status, owner_id, created_at
- Activities loaded on-demand per lead
- List query optimized with LEFT JOIN for owner name

---

## 🎯 Business Rules

1. **Zone Immutability** - Lead's zone cannot be changed after creation
2. **Same-Zone Assignment** - Can only assign to users in same zone
3. **Status Workflow** - Status changes tracked in activities
4. **Unassigned Default** - New leads have null owner_id
5. **Activity Immutability** - Activities cannot be edited or deleted
6. **Audit Trail** - All changes logged with user attribution

---

## Integration Notes

Phase 2 integrates with Phase 1:

- Uses `auth.service` for user validation
- Uses `permission-validator` for access checks
- Uses `audit.service` for logging
- Uses `database.service` for queries
- Uses JWT middleware for authentication
- Uses zone context from authenticated user
