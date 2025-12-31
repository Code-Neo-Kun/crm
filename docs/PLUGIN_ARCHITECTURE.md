# 🏗️ Plugin Architecture – Zone-Based CRM

**Version:** 1.0  
**Status:** Step 3 Foundation  
**Last Updated:** 2025-12-31

---

## Overview

**Goal:** Build a modular, extensible system where:

- Core system handles auth, zones, permissions
- Modules (leads, projects, tasks, etc.) are plugins
- Future add-ons (WhatsApp, email, mobile) integrate cleanly

---

## 1. Architecture Layers

```
┌─────────────────────────────────────────┐
│   UI Layer (Web, Mobile, Desktop)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   API Gateway / Middleware               │
│   - Authentication                       │
│   - Zone Validation                      │
│   - Permission Checks                    │
│   - Audit Logging                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Plugin Container                       │
│                                          │
│  ┌─ CORE MODULE ─────────────────────┐  │
│  │ • Auth Service                     │  │
│  │ • User Management                  │  │
│  │ • Zone Hierarchy                   │  │
│  │ • Permission Validator             │  │
│  │ • Audit Logger                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ LEAD MODULE ──────────────────────┐  │
│  │ • Lead CRUD                        │  │
│  │ • Activity Timeline                │  │
│  │ • Zone Auto-Assignment             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ PROJECT MODULE ───────────────────┐  │
│  │ • Project CRUD                     │  │
│  │ • Pipeline Management              │  │
│  │ • Stage Transitions                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ TASK MODULE ──────────────────────┐  │
│  │ • Task CRUD                        │  │
│  │ • Assignment                       │  │
│  │ • Read Tracking                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ MEETING MODULE ───────────────────┐  │
│  │ • Meeting CRUD                     │  │
│  │ • Attendee Management              │  │
│  │ • Calendar Integration             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ PRICING MODULE ───────────────────┐  │
│  │ • Pricelist Management             │  │
│  │ • Pricing Rules                    │  │
│  │ • Audit Trail                      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ REPORTING MODULE ─────────────────┐  │
│  │ • KPI Calculation                  │  │
│  │ • Daily Closing                    │  │
│  │ • Export (CSV/PDF)                 │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Service Layer                          │
│   - Database Service                     │
│   - Cache Service                        │
│   - Job Queue (async)                    │
│   - Email / Notification Service         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Data Layer                             │
│   - MySQL Database                       │
│   - Cache (Redis)                        │
│   - File Storage                         │
└──────────────────────────────────────────┘
```

---

## 2. Plugin Interface (Contract)

Every module MUST implement this interface:

```typescript
// plugin.interface.ts
interface CRMPlugin {
  // Plugin metadata
  id: string; // Unique ID: "lead", "project", "task"
  name: string; // Display name
  version: string; // Semver
  description: string;
  depends: string[]; // Array of plugin IDs this depends on

  // Lifecycle hooks
  onInstall(): Promise<void>; // Run migrations, seed data
  onEnable(): Promise<void>; // Enable in system
  onDisable(): Promise<void>; // Disable gracefully
  onUninstall(): Promise<void>; // Clean up resources

  // API registration
  registerRoutes(router: Router): void;
  registerMiddleware(app: Express): void;

  // Database
  getMigrations(): Migration[];
  getModels(): Model[];

  // Permissions
  getCapabilities(): Capability[];

  // Event handling
  onEvent(event: SystemEvent): void;

  // Health check
  health(): Promise<HealthStatus>;
}
```

---

## 3. Module Directory Structure

```
src/
├── core/                          (Core Module - Always Loaded)
│   ├── auth/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── jwt.service.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   └── authorize.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   └── plugin.ts              (Plugin definition)
│   │
│   ├── users/
│   │   ├── services/
│   │   │   └── user.service.ts
│   │   ├── controllers/
│   │   │   └── user.controller.ts
│   │   └── plugin.ts
│   │
│   ├── zones/
│   │   ├── services/
│   │   │   └── zone.service.ts
│   │   ├── controllers/
│   │   │   └── zone.controller.ts
│   │   └── plugin.ts
│   │
│   ├── permissions/
│   │   ├── services/
│   │   │   ├── permission-validator.ts
│   │   │   └── capability.service.ts
│   │   └── middleware/
│   │       └── require-capability.ts
│   │
│   └── audit/
│       ├── services/
│       │   └── audit.service.ts
│       └── plugin.ts
│
├── plugins/                       (Pluggable Modules)
│   ├── leads/
│   │   ├── services/
│   │   │   ├── lead.service.ts
│   │   │   └── activity.service.ts
│   │   ├── controllers/
│   │   │   ├── lead.controller.ts
│   │   │   └── activity.controller.ts
│   │   ├── middleware/
│   │   │   └── lead-ownership.ts
│   │   ├── migrations/
│   │   │   └── 001-create-leads.ts
│   │   ├── models/
│   │   │   ├── Lead.ts
│   │   │   └── LeadActivity.ts
│   │   ├── routes.ts
│   │   ├── capabilities.ts
│   │   └── plugin.ts              (Plugin definition)
│   │
│   ├── projects/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── migrations/
│   │   ├── routes.ts
│   │   ├── capabilities.ts
│   │   └── plugin.ts
│   │
│   ├── tasks/
│   │   └── [similar structure]
│   │
│   ├── meetings/
│   │   └── [similar structure]
│   │
│   ├── pricing/
│   │   └── [similar structure]
│   │
│   └── reporting/
│       └── [similar structure]
│
├── services/                      (Shared Infrastructure)
│   ├── database.service.ts
│   ├── cache.service.ts
│   ├── notification.service.ts
│   ├── job-queue.service.ts
│   └── storage.service.ts
│
├── middleware/                    (Global Middleware)
│   ├── error-handler.ts
│   ├── request-logger.ts
│   └── cors.ts
│
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   └── helpers.ts
│
├── types/
│   ├── plugin.d.ts
│   ├── entities.d.ts
│   └── api.d.ts
│
├── app.ts                         (Express App)
├── server.ts                      (Server Entry)
└── config.ts                      (Configuration)
```

---

## 4. Plugin Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. APPLICATION START                                │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 2. LOAD CORE PLUGINS (Auth, Zones, Permissions)     │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 3. DISCOVER OPTIONAL PLUGINS                        │
│    - Read from plugins/ folder                      │
│    - Load plugin.ts from each folder                │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 4. SORT BY DEPENDENCIES                             │
│    - Topological sort (resolve depends [])          │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 5. INITIALIZE PLUGINS                               │
│    - For each plugin:                               │
│      • Call onInstall() [migrations]                │
│      • Register routes                              │
│      • Register middleware                          │
│      • Register capabilities                        │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 6. START HTTP SERVER                                │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 7. READY FOR REQUESTS                               │
└──────────────────────────────────────────────────────┘

           ...

┌──────────────────────────────────────────────────────┐
│ GRACEFUL SHUTDOWN                                    │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│ 1. Stop accepting new requests                      │
│ 2. Wait for in-flight requests                      │
│ 3. Call onDisable() on all plugins                  │
│ 4. Close database connections                       │
│ 5. Exit                                             │
└──────────────────────────────────────────────────────┘
```

---

## 5. Plugin Container (Manager)

The plugin container is responsible for:

```typescript
// plugin-container.ts
class PluginContainer {
  private plugins: Map<string, CRMPlugin> = new Map();

  // Load and initialize plugins
  async loadPlugins(): Promise<void>;

  // Verify dependencies are satisfied
  resolveDependencies(): void;

  // Get plugin by ID
  getPlugin(id: string): CRMPlugin;

  // Register routes (call from each plugin)
  registerRoutes(router: Router, plugin: CRMPlugin): void;

  // Register middleware (call from each plugin)
  registerMiddleware(app: Express, plugin: CRMPlugin): void;

  // Emit events to plugins
  emit(event: SystemEvent): void;

  // Health status of all plugins
  health(): Promise<Record<string, HealthStatus>>;
}
```

---

## 6. Service Layer (Shared Infrastructure)

### **Database Service**

```typescript
interface DatabaseService {
  query(sql: string, params?: any[]): Promise<any[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  getConnection(): Connection;
  runMigrations(): Promise<void>;
}
```

### **Permission Validator Service**

```typescript
interface PermissionValidator {
  // Core validation
  can(userId: number, action: string, resourceType: string): Promise<boolean>;

  // Zone filtering
  getAccessibleZones(userId: number): Promise<number[]>;

  // Capability checking
  hasCapability(userId: number, capability: string): Promise<boolean>;

  // Cross-zone guard
  assertSameZone(entityZoneId: number, targetZoneId: number): void;
}
```

### **Audit Logger Service**

```typescript
interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
  query(filters: AuditFilters): Promise<AuditEntry[]>;
}
```

---

## 7. Event System

Plugins communicate via events:

```typescript
// events.ts
type SystemEvent =
  | { type: "lead.created"; payload: Lead }
  | { type: "lead.assigned"; payload: { lead: Lead; from: User; to: User } }
  | {
      type: "project.transitioned";
      payload: { project: Project; stage: string };
    }
  | { type: "task.completed"; payload: Task }
  | { type: "meeting.scheduled"; payload: Meeting }
  | { type: "pricing.updated"; payload: { list: PriceList; changes: any } };

// Usage in plugins:
pluginContainer.on("lead.created", (event) => {
  // Send notification, create audit log, trigger workflow, etc.
});
```

---

## 8. Error Handling

All APIs follow standard error format:

```typescript
interface APIError {
  code: string; // 'PERMISSION_DENIED', 'ZONE_MISMATCH', etc.
  message: string;
  statusCode: number; // HTTP status
  timestamp: ISO8601;
  requestId: string;
  details?: Record<string, any>;
}
```

---

## 9. Configuration (plugin config)

Each plugin has config file:

```typescript
// plugins/leads/config.ts
export default {
  enabled: true,
  autoAssignZone: true,
  allowCrossZoneTransfer: false,
  defaultLeadStatus: "new",
  statusWorkflow: {
    new: ["contacted"],
    contacted: ["interested", "lost"],
    interested: ["proposal"],
    proposal: ["won", "lost"],
    won: [],
    lost: [],
  },
};
```

---

## 10. Testing Strategy

### **Unit Tests (per module)**

```
plugins/leads/__tests__/
├── services/
│   └── lead.service.test.ts
├── controllers/
│   └── lead.controller.test.ts
└── middleware/
    └── lead-ownership.test.ts
```

### **Integration Tests**

```
__tests__/integration/
├── leads.integration.test.ts
├── zone-access.integration.test.ts
├── permissions.integration.test.ts
└── workflow.integration.test.ts
```

### **API Contract Tests**

```
__tests__/api/
├── lead-api.test.ts
├── project-api.test.ts
└── cross-zone-denial.test.ts
```

---

## 11. Deployment Strategy

### **Core modules (always deployed)**

- Auth
- Users
- Zones
- Permissions
- Audit

### **Optional modules (configurable)**

- Leads
- Projects
- Tasks
- Meetings
- Pricing
- Reporting

**Configuration for deployment:**

```yaml
# config/plugins.yml
plugins:
  core:
    auth: true
    users: true
    zones: true
    permissions: true
    audit: true

  optional:
    leads: true
    projects: true
    tasks: true
    meetings: true
    pricing: true
    reporting: true

  future:
    whatsapp: false
    email_automation: false
    mobile_api: false
```

---

## 12. Extensibility (Future Add-ons)

### **WhatsApp Integration Plugin**

```typescript
plugins/whatsapp/plugin.ts
- Send lead notifications
- Receive customer messages
- Store conversations
```

### **Email Automation Plugin**

```typescript
plugins/email_automation/plugin.ts
- Scheduled lead follow-ups
- Status change notifications
- Daily summary emails
```

### **Mobile API Gateway**

```typescript
plugins/mobile_api/plugin.ts
- GraphQL API
- Mobile-specific endpoints
- Offline sync
```

---

## 13. Implementation Checklist

- [ ] Create plugin interface/contract
- [ ] Implement PluginContainer class
- [ ] Create core module (auth, zones, permissions)
- [ ] Extract each feature into plugin
- [ ] Implement event system
- [ ] Add dependency resolution
- [ ] Write plugin loading tests
- [ ] Document plugin creation guide
- [ ] Setup health check endpoint
- [ ] Add plugin marketplace concept (future)

---

## 14. Next Steps

1. ✅ Data Model (Step 1)
2. ✅ Permission Matrix (Step 2)
3. ✅ Plugin Architecture (Step 3)
4. → API Contract Design (Step 4)
5. → Implementation (Phase 1: Core)
