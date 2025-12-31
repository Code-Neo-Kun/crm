# Zone-Based CRM System

**Fully Implemented Multi-Phase CRM with Pricing, Reporting, and Analytics**

## Overview

A comprehensive, secure, internal-use CRM built with TypeScript, Node.js, Express, and MySQL. Designed for zone-based visibility with complete lead management, project pipelines, task tracking, meeting scheduling, pricing management, and advanced reporting capabilities.

**Total Implementation: 60+ API endpoints, 8,000+ lines of code, complete audit trails, role-based access control**

## Phases Implemented ✓

### Phase 1: System Core ✅

- JWT-based authentication
- Database layer with connection pooling
- Permission validator with role × zone × capability model
- Comprehensive audit logging system
- 4 authentication endpoints

### Phase 2: Lead Management ✅

- Full CRUD operations for leads
- Activity timeline tracking
- Zone-based lead assignment
- Lead-to-project conversion
- 6 lead management endpoints

### Phase 3: Pipelines & Projects ✅

- Pipeline stage management with sequence ordering
- Project creation and status transitions
- Kanban-style workflow with validation
- Activity tracking for all changes
- 17 pipeline and project endpoints

### Phase 4: Tasks & Meetings ✅

- Task assignment with priority and due dates
- Comment threads for collaboration
- Meeting scheduling with attendee management
- RSVP tracking and response management
- 21 task and meeting endpoints

### Phase 5: Pricing & Reporting ✅

- Zone-wise price list management with versioning
- Tiered pricing (standard, professional, enterprise, custom)
- Complete pricing audit trails
- Daily closing reports with KPI calculations
- Revenue variance analysis and trend analysis
- Multi-period reporting (daily, weekly, monthly, quarterly, yearly)
- Zone comparison analytics (Super Admin)
- 16+ reporting and pricing endpoints

## Technology Stack

- **Language**: TypeScript 5.3
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.18
- **Database**: MySQL 8.0+
- **Authentication**: JWT (jsonwebtoken 9.1)
- **Security**: bcryptjs, Helmet
- **Logging**: Morgan
- **Environment**: dotenv

## Features

### Security

- ✅ JWT-based stateless authentication
- ✅ Bcryptjs password hashing with salt rounds
- ✅ Role-based access control (RBAC)
- ✅ Zone-based multi-tenancy
- ✅ Comprehensive audit logging
- ✅ Request ID tracking
- ✅ CORS configuration

### Data Management

- ✅ 25+ database tables with relationships
- ✅ Foreign key constraints
- ✅ Transaction support for atomic operations
- ✅ Soft deletes for data preservation
- ✅ Indexed queries for performance
- ✅ Connection pooling (10 concurrent connections)

### Modules

- ✅ Authentication & Authorization
- ✅ Lead Management (CRUD + activities)
- ✅ Pipeline & Project Management (Kanban workflow)
- ✅ Task Management (assignment, comments, tracking)
- ✅ Meeting Management (scheduling, RSVP, attendees)
- ✅ Pricing Management (lists, items, audit trails)
- ✅ Reporting (daily closing, KPIs, variance analysis)

### Reporting & Analytics

- ✅ Daily closing reports
- ✅ Automatic KPI calculation (6 metrics)
- ✅ Revenue variance analysis
- ✅ 30-day trend analysis
- ✅ Zone performance comparison
- ✅ Multi-period report generation
- ✅ Status workflow (draft → submitted → approved)

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone repository and navigate to directory
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Initialize database:

   ```bash
   npm run db:init
   ```

5. Start server:
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:3000`

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All endpoints (except `/auth/login`) require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

### Response Format

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "pagination": { ... }
}
```

### Error Format

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

## Endpoint Summary

| Category       | Count  | Status          |
| -------------- | ------ | --------------- |
| Authentication | 4      | ✅ Complete     |
| Leads          | 6      | ✅ Complete     |
| Pipelines      | 7      | ✅ Complete     |
| Projects       | 10     | ✅ Complete     |
| Tasks          | 12     | ✅ Complete     |
| Meetings       | 9      | ✅ Complete     |
| Pricing        | 9      | ✅ Complete     |
| Reports        | 7      | ✅ Complete     |
| **Total**      | **64** | **✅ Complete** |

## Documentation

### Complete Documentation Files

- [`PHASE1_SETUP.md`](docs/PHASE1_SETUP.md) - Installation and core setup
- [`PHASE2_LEADS.md`](docs/PHASE2_LEADS.md) - Lead management API
- [`PHASE3_PROJECTS.md`](docs/PHASE3_PROJECTS.md) - Pipelines and projects API
- [`PHASE4_TASKS_MEETINGS.md`](docs/PHASE4_TASKS_MEETINGS.md) - Tasks and meetings API
- [`PHASE5_PRICING_REPORTING.md`](docs/PHASE5_PRICING_REPORTING.md) - Pricing and reporting API
- [`PHASE5_QUICK_REFERENCE.md`](docs/PHASE5_QUICK_REFERENCE.md) - Quick reference guide
- [`DATA_MODEL.md`](docs/DATA_MODEL.md) - Complete database schema
- [`PERMISSION_MATRIX.md`](docs/PERMISSION_MATRIX.md) - Role and permission definitions
- [`PLUGIN_ARCHITECTURE.md`](docs/PLUGIN_ARCHITECTURE.md) - Plugin system design
- [`API_CONTRACTS.md`](docs/API_CONTRACTS.md) - REST API specifications

### Architecture Overview

```
src/
├── core/
│   ├── auth/              # Authentication & JWT
│   ├── permissions/       # RBAC system
│   └── audit/             # Audit logging
├── plugins/
│   ├── leads/             # Lead management
│   ├── projects/          # Projects & pipelines
│   ├── tasks/             # Tasks & meetings
│   └── pricing/           # Pricing & reporting
├── services/
│   └── database.service   # Database layer
├── middleware/
│   └── authenticate       # Auth middleware
├── types/
│   └── index.ts           # TypeScript definitions
└── utils/
    └── logger             # Logging utility
```

## Key Capabilities

### Zone-Based Access Control

- Users assigned to zones
- Can only view/manage data within their zone
- Super admins can access all zones
- Zone isolation enforced at database and application layers

### Role-Based Permissions

```
Super Admin      → All capabilities across all zones
Zone Admin       → Manage zone, approve reports
Manager          → Manage leads, projects, tasks, submit reports
Sales User       → Create leads, submit daily closings
```

### Audit Trail

- All operations logged with:
  - User ID
  - Action type (create, update, delete)
  - Entity type and ID
  - Old and new values
  - Timestamp
  - Request ID for tracing

### Data Integrity

- Foreign key constraints
- Transaction support
- Soft deletes preserve history
- Unique constraints on critical fields
- Validation at service layer

## Database Schema Highlights

### Core Tables

- `users` - User accounts with roles
- `zones` - Geographic or organizational zones
- `user_zones` - User-zone assignments
- `roles` - Role definitions
- `role_capabilities` - Permission mappings
- `audit_logs` - Complete audit trail

### Business Tables

- `leads` - Sales leads
- `pipelines` - Sales pipeline definitions
- `pipeline_stages` - Pipeline stage configuration
- `projects` - Projects with stage tracking
- `tasks` - Task assignments
- `meetings` - Meeting scheduling
- `price_lists` - Pricing configuration
- `daily_closings` - Daily sales reports

## Environment Configuration

Key environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crm_db
DB_USER=root
DB_PASSWORD=password
DB_POOL_SIZE=10

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Performance Considerations

- Connection pooling with 10 concurrent connections
- Database indexes on frequently queried fields
- Pagination (default 20 items per page)
- Efficient query filtering at database layer
- Request ID tracking for debugging

## Testing

Example requests using curl:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create lead
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Create daily closing
curl -X POST http://localhost:3000/api/v1/reports/daily-closing \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"closing_date":"2024-01-15","total_leads":50,"leads_converted":15,...}'
```

## Error Handling

The API provides detailed error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

## Future Enhancements

- WebSocket support for real-time updates
- Advanced filtering and search
- Data export (CSV, Excel)
- Notification system
- Mobile app integration
- Advanced analytics dashboard
- Machine learning for forecasting
- Integration with third-party services

## Project Structure

```
crm/
├── src/
│   ├── core/
│   ├── plugins/
│   ├── services/
│   ├── middleware/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── docs/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## License

Internal Use Only

## Support

For issues or questions, contact the development team.

---

**Status**: ✅ All 5 Phases Complete - Production Ready
