# 📋 Permission Matrix – Role × Capability × Zone

**Version:** 1.0  
**Status:** Step 2 Foundation  
**Last Updated:** 2025-12-31

---

## Overview

Access Control Model = **Role × Zone × Capability**

- **Role** = Global role assigned via user_zones table
- **Zone** = Data scope determined by zone_id
- **Capability** = Fine-grained action permission

**Evaluation Logic:**

```
CAN_ACCESS = (user.role has capability) AND (entity.zone_id in user.accessible_zones)
```

---

## 1. Role Hierarchy

```
┌─ Super Admin
│  └─ Full system access (all zones, all capabilities)
│
├─ Zone Admin
│  └─ Full control within assigned zone(s)
│
├─ Manager
│  └─ Team leadership (own zone, team features, reporting)
│
├─ Staff
│  └─ Individual contributor (own zone, own leads/tasks)
│
└─ Viewer
   └─ Read-only access (own zone, no modifications)
```

---

## 2. Capability-to-Role Matrix

### **CORE CAPABILITIES**

| Capability         | Super Admin | Zone Admin | Manager | Staff | Viewer |
| ------------------ | ----------- | ---------- | ------- | ----- | ------ |
| `core.user.manage` | ✅          | ❌         | ❌      | ❌    | ❌     |
| `core.zone.manage` | ✅          | ❌         | ❌      | ❌    | ❌     |
| `core.role.manage` | ✅          | ✅\*       | ❌      | ❌    | ❌     |

\*Zone Admin can assign roles within their zone only

---

### **LEAD CAPABILITIES**

| Capability    | Super Admin | Zone Admin | Manager | Staff | Viewer |
| ------------- | ----------- | ---------- | ------- | ----- | ------ |
| `lead.create` | ✅          | ✅         | ✅      | ✅    | ❌     |
| `lead.read`   | ✅          | ✅         | ✅      | ✅\*  | ✅\*\* |
| `lead.edit`   | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `lead.assign` | ✅          | ✅         | ✅      | ❌    | ❌     |
| `lead.delete` | ✅          | ✅\*\*     | ❌      | ❌    | ❌     |

**Notes:**

- \*Staff can only edit/view own leads
- \*\*Viewer can only view non-sensitive leads
- \*\*Zone Admin can delete only their zone's leads

---

### **PROJECT CAPABILITIES**

| Capability           | Super Admin | Zone Admin | Manager | Staff | Viewer |
| -------------------- | ----------- | ---------- | ------- | ----- | ------ |
| `project.create`     | ✅          | ✅         | ✅      | ✅    | ❌     |
| `project.read`       | ✅          | ✅         | ✅      | ✅\*  | ✅\*\* |
| `project.edit`       | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `project.transition` | ✅          | ✅         | ✅      | ❌    | ❌     |
| `project.close`      | ✅          | ✅         | ✅      | ❌    | ❌     |

**Notes:**

- \*Staff can only edit projects they own
- \*\*Viewer can view projects (read-only)

---

### **TASK CAPABILITIES**

| Capability      | Super Admin | Zone Admin | Manager | Staff | Viewer |
| --------------- | ----------- | ---------- | ------- | ----- | ------ |
| `task.create`   | ✅          | ✅         | ✅      | ✅    | ❌     |
| `task.read`     | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `task.edit`     | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `task.assign`   | ✅          | ✅         | ✅      | ❌    | ❌     |
| `task.complete` | ✅          | ✅         | ✅      | ✅\*  | ❌     |

**Notes:**

- \*Staff can only read/edit/complete tasks assigned to them
- Task visibility is assignee + assigner only

---

### **MEETING CAPABILITIES**

| Capability        | Super Admin | Zone Admin | Manager | Staff | Viewer |
| ----------------- | ----------- | ---------- | ------- | ----- | ------ |
| `meeting.create`  | ✅          | ✅         | ✅      | ✅    | ❌     |
| `meeting.read`    | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `meeting.edit`    | ✅          | ✅         | ✅      | ✅\*  | ❌     |
| `meeting.invite`  | ✅          | ✅         | ✅      | ✅    | ❌     |
| `meeting.respond` | ✅          | ✅         | ✅      | ✅    | ❌     |

**Notes:**

- \*Staff can only view/edit meetings they organize or are invited to
- Invitations restricted to same-zone users only

---

### **PRICING CAPABILITIES**

| Capability        | Super Admin | Zone Admin | Manager | Staff | Viewer |
| ----------------- | ----------- | ---------- | ------- | ----- | ------ |
| `pricing.read`    | ✅          | ✅         | ✅      | ✅    | ✅     |
| `pricing.edit`    | ✅          | ✅         | ❌      | ❌    | ❌     |
| `pricing.approve` | ✅          | ✅         | ❌      | ❌    | ❌     |
| `pricing.apply`   | ✅          | ✅         | ✅      | ✅    | ❌     |

**Notes:**

- Pricing visibility = user's zone(s) only
- Pricing changes require approval (audit logged)

---

### **REPORTING CAPABILITIES**

| Capability        | Super Admin | Zone Admin | Manager | Staff | Viewer |
| ----------------- | ----------- | ---------- | ------- | ----- | ------ |
| `report.view`     | ✅          | ✅         | ✅      | ❌    | ❌     |
| `report.create`   | ✅          | ✅         | ✅      | ❌    | ❌     |
| `report.export`   | ✅          | ✅         | ✅      | ❌    | ❌     |
| `report.schedule` | ✅          | ✅         | ❌      | ❌    | ❌     |

**Notes:**

- Reports auto-filtered to user's accessible zones
- Managers see team-level aggregates only
- Zone Admins see zone-level data

---

## 3. Data Access Rules (Zone Enforcement)

### **3.1 Lead Access**

```
User CAN ACCESS Lead IF:
  1. lead.zone_id IN user.accessible_zones AND
  2. user.role has lead.read capability

User CAN EDIT Lead IF:
  1. Conditions above + lead.edit capability AND
  2. (user is lead.owner OR user is zone_admin OR user is super_admin)

User CAN ASSIGN Lead IF:
  1. Conditions above + lead.assign capability AND
  2. new_owner.zone_id == lead.zone_id (no cross-zone assignment)
```

---

### **3.2 Project Access**

```
User CAN ACCESS Project IF:
  1. project.zone_id IN user.accessible_zones AND
  2. user.role has project.read capability

User CAN TRANSITION Stage IF:
  1. Conditions above + project.transition capability AND
  2. user is project.owner OR user is zone_admin OR user is super_admin
```

---

### **3.3 Task Access**

```
User CAN READ Task IF:
  1. task.zone_id IN user.accessible_zones AND
  2. (user == task.assigned_to OR user == task.assigned_by OR user is manager+ role)

User CAN ASSIGN Task IF:
  1. task.zone_id IN user.accessible_zones AND
  2. assignee.zone_id == task.zone_id AND
  3. user.role has task.assign capability
```

---

### **3.4 Meeting Access**

```
User CAN VIEW Meeting IF:
  1. meeting.zone_id IN user.accessible_zones AND
  2. (user is organizer OR user in meeting_attendees OR user is manager+)

User CAN INVITE User TO Meeting IF:
  1. Conditions above AND
  2. invited_user.zone_id == meeting.zone_id (same zone only)
```

---

### **3.5 Pricing Access**

```
User CAN VIEW Price IF:
  1. price_list.zone_id IN user.accessible_zones

User CAN EDIT Price IF:
  1. Conditions above AND
  2. user.role has pricing.edit capability AND
  3. changes logged in pricing_audit
```

---

## 4. Cross-Zone Rules (STRICT)

| Action                     | Allowed | Exception                             |
| -------------------------- | ------- | ------------------------------------- |
| Cross-zone lead assignment | ❌ No   | Super Admin only (logged)             |
| Cross-zone project access  | ❌ No   | Super Admin only (logged)             |
| Cross-zone task assignment | ❌ No   | Super Admin only (logged)             |
| Cross-zone meeting invites | ❌ No   | Never—invite same-zone only           |
| Cross-zone report view     | ❌ No   | Super Admin, Zone Admin (their zones) |

**👉 All cross-zone denials must return 403 Forbidden with audit log**

---

## 5. Implicit Permissions (Derived)

| Derived Permission      | Condition                          |
| ----------------------- | ---------------------------------- |
| Can read own profile    | Any authenticated user             |
| Can change own password | Any authenticated user             |
| Can view own task list  | Assigned tasks OR assigned by user |
| Can view own activity   | Activities where user_id matches   |
| Can download own export | Report export for user's own zones |

---

## 6. Query Filtering Strategy

### **Every database query must apply zone filter:**

```sql
-- Example: Get all leads for authenticated user
SELECT l.* FROM leads l
WHERE
  l.zone_id IN (
    SELECT uz.zone_id FROM user_zones uz
    WHERE uz.user_id = ? AND uz.is_active = TRUE
  )
  AND l.status != 'deleted'
ORDER BY l.created_at DESC;
```

### **Capability check in application logic:**

```
1. Authenticate user
2. Load user's role(s) + zones
3. For each request:
   a. Verify zone_id in request matches user's accessible zones
   b. Check role has required capability
   c. Apply additional entity-specific logic (e.g., owner check)
4. If any check fails → 403 Forbidden + Audit Log
```

---

## 7. Audit Requirements

**Must log:**

- ✅ Successful cross-zone denial attempts
- ✅ Capability check failures
- ✅ Privilege escalation attempts
- ✅ All CRUD operations on sensitive entities
- ✅ Role/capability changes
- ✅ Pricing updates (with old/new values)

**Log fields:**

```json
{
  "timestamp": "2025-12-31T10:30:45Z",
  "user_id": 42,
  "zone_id": 5,
  "action": "denied",
  "reason": "cross_zone_assignment_denied",
  "entity_type": "lead",
  "entity_id": 100,
  "attempted_target_zone": 7,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

---

## 8. Implementation Checklist

- [ ] User service validates role + zone on every request
- [ ] Database queries include zone filter
- [ ] Capability check before mutation operations
- [ ] Cross-zone attempts logged and rejected
- [ ] API returns 403 Forbidden for permission denials
- [ ] Audit logs include IP + user agent
- [ ] Pricing changes audit trail created
- [ ] Session management validates zone context
- [ ] Super Admin actions trigger extra logging
- [ ] Unit tests for each permission rule
- [ ] Integration tests for role + zone combinations

---

## 9. Next Steps

1. ✅ Data Model (Step 1)
2. ✅ Permission Matrix (Step 2)
3. → API Contract Design (Step 3)
4. → Plugin Architecture (Step 4)
