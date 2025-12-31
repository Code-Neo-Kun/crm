# Phase 5: Pricing & Reporting Documentation

## Overview

Phase 5 implements zone-wise price list management with audit trails and comprehensive daily closing reports with KPI calculations and variance analysis. This module enables:

- **Pricing Management**: Create and manage price lists with tiered pricing (standard, professional, enterprise, custom)
- **Item Management**: Add items to price lists with flexible pricing configurations
- **Pricing Audit**: Complete audit trail tracking all pricing changes with version control
- **Daily Closing Reports**: Submit daily sales closings with metrics and KPIs
- **KPI Tracking**: Automatic calculation of key performance indicators
- **Variance Analysis**: Track actual vs. projected revenue with performance metrics
- **Trend Analysis**: 30+ day trend analysis with growth metrics
- **Zone Comparison**: Compare performance across multiple zones (Super Admin only)

## Database Schema

### price_lists Table

```sql
CREATE TABLE price_lists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  currency VARCHAR(10) DEFAULT 'INR',
  is_active TINYINT DEFAULT 1,
  version INT DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_zone_active (zone_id, is_active),
  INDEX idx_created_at (created_at)
);
```

### price_list_items Table

```sql
CREATE TABLE price_list_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  price_list_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  tier ENUM('standard', 'professional', 'enterprise', 'custom') NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  quantity_breakpoint INT,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  description TEXT,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
  UNIQUE KEY unique_item_code (price_list_id, item_code),
  INDEX idx_tier (tier)
);
```

### pricing_audit Table

```sql
CREATE TABLE pricing_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  price_list_id INT NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  changed_by INT NOT NULL,
  old_value JSON,
  new_value JSON,
  change_reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_price_list_created (price_list_id, created_at)
);
```

### daily_closings Table

```sql
CREATE TABLE daily_closings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  zone_id INT NOT NULL,
  closing_date DATE NOT NULL,
  total_leads INT NOT NULL,
  leads_converted INT NOT NULL,
  conversion_rate DECIMAL(5, 2),
  total_revenue DECIMAL(12, 2) NOT NULL,
  projected_revenue DECIMAL(12, 2) NOT NULL,
  revenue_variance DECIMAL(12, 2),
  variance_percentage DECIMAL(5, 2),
  new_deals_created INT DEFAULT 0,
  deals_closed INT DEFAULT 0,
  customer_calls INT DEFAULT 0,
  customer_meetings INT DEFAULT 0,
  proposal_sent INT DEFAULT 0,
  proposal_accepted INT DEFAULT 0,
  status ENUM('draft', 'submitted', 'approved', 'archived') DEFAULT 'draft',
  notes TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  UNIQUE KEY unique_daily_closing (zone_id, closing_date),
  INDEX idx_zone_date (zone_id, closing_date),
  INDEX idx_status (status)
);
```

## Permission Model

### Required Capabilities

```
Pricing Management:
  - manage_pricing (Create, update, delete price lists)
  - view_pricing (View price lists and items)
  - view_audit (Access pricing audit trails)

Reporting:
  - manage_reports (Create, submit, update daily closings)
  - view_reports (View all reports and analytics)
  - approve_reports (Approve submitted reports - Zone Admin only)
```

### Role Mapping

```
Super Admin:
  - manage_pricing ✓
  - view_pricing ✓
  - manage_reports ✓
  - view_reports ✓
  - approve_reports ✓
  - Compare zones ✓

Zone Admin:
  - manage_pricing ✓
  - view_pricing ✓
  - manage_reports ✓
  - view_reports ✓
  - approve_reports ✓

Manager:
  - view_pricing ✓
  - manage_reports ✓
  - view_reports ✓

Sales User:
  - view_pricing ✓
  - view_reports ✓ (own zone only)
```

## API Endpoints

### Pricing Management

#### 1. Create Price List

```
POST /api/v1/pricing/pricelist
Content-Type: application/json

{
  "name": "Standard Pricing Q1 2024",
  "description": "Q1 2024 standard pricing tier",
  "currency": "INR",
  "items": [
    {
      "item_name": "Service A",
      "item_code": "SVC-A",
      "tier": "standard",
      "unit_price": 10000,
      "quantity_breakpoint": null,
      "discount_percentage": 0,
      "description": "Basic service"
    },
    {
      "item_name": "Service B",
      "item_code": "SVC-B",
      "tier": "professional",
      "unit_price": 25000,
      "quantity_breakpoint": 10,
      "discount_percentage": 5,
      "description": "Professional service"
    }
  ]
}

Response:
{
  "success": true,
  "message": "Price list created successfully",
  "data": {
    "id": 1,
    "zone_id": 1,
    "name": "Standard Pricing Q1 2024",
    "description": "Q1 2024 standard pricing tier",
    "currency": "INR",
    "is_active": true,
    "version": 1,
    "created_by": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "items": [...]
  }
}
```

#### 2. Get Price List with Items

```
GET /api/v1/pricing/pricelist/{id}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "zone_id": 1,
    "name": "Standard Pricing Q1 2024",
    "currency": "INR",
    "is_active": true,
    "version": 1,
    "items": [
      {
        "id": 1,
        "price_list_id": 1,
        "item_name": "Service A",
        "item_code": "SVC-A",
        "tier": "standard",
        "unit_price": 10000,
        "quantity_breakpoint": null,
        "discount_percentage": 0,
        "is_active": true
      }
    ]
  }
}
```

#### 3. List Price Lists

```
GET /api/v1/pricing/pricelist?page=1&pageSize=20&isActive=true&search=Q1

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### 4. Update Price List

```
PUT /api/v1/pricing/pricelist/{id}
Content-Type: application/json

{
  "name": "Updated Pricing Q1 2024",
  "currency": "INR",
  "is_active": true
}

Response:
{
  "success": true,
  "message": "Price list updated successfully",
  "data": {...}
}
```

#### 5. Add Item to Price List

```
POST /api/v1/pricing/pricelist/{id}/items
Content-Type: application/json

{
  "item_name": "Service C",
  "item_code": "SVC-C",
  "tier": "enterprise",
  "unit_price": 50000,
  "quantity_breakpoint": 50,
  "discount_percentage": 10,
  "description": "Enterprise service"
}

Response:
{
  "success": true,
  "message": "Item added to price list successfully",
  "data": {
    "id": 3,
    "price_list_id": 1,
    "item_name": "Service C",
    "item_code": "SVC-C",
    "tier": "enterprise",
    "unit_price": 50000,
    "quantity_breakpoint": 50,
    "discount_percentage": 10,
    "is_active": true,
    "created_at": "2024-01-15T10:35:00Z"
  }
}
```

#### 6. Update Price List Item

```
PUT /api/v1/pricing/pricelist/{priceListId}/items/{itemId}
Content-Type: application/json

{
  "unit_price": 12000,
  "discount_percentage": 5
}

Response:
{
  "success": true,
  "message": "Item updated successfully",
  "data": {...}
}
```

#### 7. Delete Price List

```
DELETE /api/v1/pricing/pricelist/{id}

Response:
{
  "success": true,
  "message": "Price list deleted successfully"
}
```

#### 8. Get Pricing Audit History

```
GET /api/v1/pricing/pricelist/{id}/audit?limit=50

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "price_list_id": 1,
      "action": "create",
      "changed_by": 1,
      "old_value": null,
      "new_value": {
        "name": "Standard Pricing",
        "items": 2
      },
      "change_reason": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 9. Compare Pricing Across Lists

```
GET /api/v1/pricing/compare?itemCode=SVC-A

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Q1 2024 Pricing",
      "item_name": "Service A",
      "item_code": "SVC-A",
      "tier": "standard",
      "unit_price": 10000,
      "discount_percentage": 0
    },
    {
      "id": 2,
      "name": "Q2 2024 Pricing",
      "item_name": "Service A",
      "item_code": "SVC-A",
      "tier": "standard",
      "unit_price": 11000,
      "discount_percentage": 5
    }
  ]
}
```

### Reporting

#### 1. Create Daily Closing Report

```
POST /api/v1/reports/daily-closing
Content-Type: application/json

{
  "closing_date": "2024-01-15",
  "total_leads": 45,
  "leads_converted": 12,
  "total_revenue": 1200000,
  "projected_revenue": 1500000,
  "new_deals_created": 5,
  "deals_closed": 3,
  "customer_calls": 23,
  "customer_meetings": 8,
  "proposal_sent": 4,
  "proposal_accepted": 2,
  "notes": "Good performance today"
}

Response:
{
  "success": true,
  "message": "Daily closing report created successfully",
  "data": {
    "id": 1,
    "zone_id": 1,
    "closing_date": "2024-01-15",
    "total_leads": 45,
    "leads_converted": 12,
    "conversion_rate": 26.67,
    "total_revenue": 1200000,
    "projected_revenue": 1500000,
    "revenue_variance": -300000,
    "variance_percentage": -20.0,
    "new_deals_created": 5,
    "deals_closed": 3,
    "customer_calls": 23,
    "customer_meetings": 8,
    "proposal_sent": 4,
    "proposal_accepted": 2,
    "status": "draft",
    "notes": "Good performance today",
    "created_at": "2024-01-15T18:30:00Z"
  }
}
```

#### 2. Get Daily Closing by ID

```
GET /api/v1/reports/daily-closing/{id}

Response:
{
  "success": true,
  "data": {...}
}
```

#### 3. List Daily Closings

```
GET /api/v1/reports/daily-closing?page=1&pageSize=20&status=submitted&startDate=2024-01-01&endDate=2024-01-31

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 31,
    "totalPages": 2
  }
}
```

#### 4. Update Daily Closing

```
PUT /api/v1/reports/daily-closing/{id}
Content-Type: application/json

{
  "total_leads": 50,
  "leads_converted": 15,
  "total_revenue": 1500000
}

Note: Can only update draft reports

Response:
{
  "success": true,
  "message": "Daily closing updated successfully",
  "data": {...}
}
```

#### 5. Submit Daily Closing for Approval

```
POST /api/v1/reports/daily-closing/{id}/submit
Content-Type: application/json

{}

Response:
{
  "success": true,
  "message": "Daily closing submitted for approval",
  "data": {
    "status": "submitted",
    ...
  }
}
```

#### 6. Approve Daily Closing (Zone Admin Only)

```
POST /api/v1/reports/daily-closing/{id}/approve
Content-Type: application/json

{}

Response:
{
  "success": true,
  "message": "Daily closing approved successfully",
  "data": {
    "status": "approved",
    "approved_by": 1,
    "approved_at": "2024-01-15T19:00:00Z",
    ...
  }
}
```

#### 7. Generate Report for Period

```
POST /api/v1/reports/generate
Content-Type: application/json

{
  "period": "monthly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "includeVariance": true,
  "includeKPIs": true
}

Response:
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "period": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "totalDays": 31,
    "summary": {
      "totalLeads": 1395,
      "leadsConverted": 372,
      "conversionRate": 26.66,
      "totalRevenue": 37200000,
      "projectedRevenue": 46500000,
      "revenueVariance": -9300000,
      "variancePercentage": -20.0
    },
    "kpis": [
      {
        "metric": "avg_leads_per_day",
        "value": 45,
        "status": "calculated",
        "trend": 0
      },
      {
        "metric": "avg_conversion_rate",
        "value": 26.66,
        "status": "calculated",
        "trend": 0
      },
      {
        "metric": "avg_revenue_per_day",
        "value": 1200000,
        "status": "calculated",
        "trend": 0
      },
      {
        "metric": "deals_created",
        "value": 155,
        "status": "calculated",
        "trend": 0
      },
      {
        "metric": "deals_closed",
        "value": 93,
        "status": "calculated",
        "trend": 0
      },
      {
        "metric": "customer_interactions",
        "value": 713,
        "status": "calculated",
        "trend": 0
      }
    ],
    "variance": {
      "totalVariance": -9300000,
      "minVariance": -600000,
      "maxVariance": 100000,
      "avgVariance": -300000,
      "variancePercentage": -20.0,
      "status": "below_target"
    },
    "dailyData": [...]
  }
}
```

#### 8. Compare Zone Performance (Super Admin Only)

```
POST /api/v1/reports/compare-zones
Content-Type: application/json

{
  "zoneIds": [1, 2, 3],
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}

Response:
{
  "success": true,
  "message": "Zone comparison generated successfully",
  "data": [
    {
      "zone_id": 1,
      "total_reports": 31,
      "total_leads": 1395,
      "leads_converted": 372,
      "avg_conversion_rate": 26.66,
      "total_revenue": 37200000,
      "projected_revenue": 46500000,
      "revenue_variance": -9300000,
      "variance_percentage": -20.0
    },
    {
      "zone_id": 2,
      "total_reports": 31,
      "total_leads": 1550,
      "leads_converted": 450,
      "avg_conversion_rate": 29.03,
      "total_revenue": 45000000,
      "projected_revenue": 45000000,
      "revenue_variance": 0,
      "variance_percentage": 0.0
    }
  ]
}
```

#### 9. Get Trend Analysis

```
GET /api/v1/reports/trend-analysis?days=30

Response:
{
  "success": true,
  "message": "Trend analysis generated successfully",
  "data": {
    "period": 30,
    "data": [...],
    "trend": {
      "leads": 2.5,
      "conversion": 0.5,
      "revenue": 50000
    },
    "averages": {
      "leads": 45,
      "conversion": 26.66,
      "revenue": 1200000
    }
  }
}
```

## Pricing Tiers

### Tier Types

```
1. STANDARD
   - Entry-level pricing
   - Basic features
   - No quantity discounts
   - Suitable for small purchases

2. PROFESSIONAL
   - Mid-level pricing
   - Enhanced features
   - Volume discounts available
   - Suitable for regular purchases

3. ENTERPRISE
   - Premium pricing
   - Full feature access
   - Significant volume discounts
   - Dedicated support

4. CUSTOM
   - Negotiated pricing
   - Tailored features
   - Custom discounts
   - Special terms
```

## Report Periods

```
DAILY - Single day closing
WEEKLY - 7-day summary (Monday-Sunday)
MONTHLY - Calendar month summary
QUARTERLY - 3-month summary (Q1, Q2, Q3, Q4)
YEARLY - Calendar year summary
```

## Validation Rules

### Price List Validation

```
- name: 1-200 characters (required)
- description: 0-2000 characters
- currency: ISO 4217 code (default: INR)
- items: minimum 1 item required
```

### Price List Item Validation

```
- item_name: 1-150 characters (required)
- item_code: 1-50 characters (unique per price list)
- tier: must be standard|professional|enterprise|custom
- unit_price: 0-999999.99
- quantity_breakpoint: optional integer
- discount_percentage: 0-100
```

### Daily Closing Validation

```
- closing_date: valid date (no future dates)
- total_leads: >= 0
- leads_converted: 0 to total_leads
- total_revenue: >= 0
- projected_revenue: >= 0
- Activities: >= 0
```

## Status Workflows

### Price List Status

```
ACTIVE → (update) → ACTIVE
       → (soft delete) → INACTIVE
```

### Daily Closing Status

```
DRAFT → (update) → DRAFT
     → (submit) → SUBMITTED
            → (approve) → APPROVED
                      → (archive) → ARCHIVED
```

## Key Features

### 1. Pricing Audit Trail

- Complete history of all pricing changes
- Old and new values tracked
- User attribution for changes
- Timestamp for each change
- Change reason optional field

### 2. Version Control

- Price list version incremented on updates
- Historical pricing available
- Ability to compare versions

### 3. KPI Calculations

Automatic calculation of:

- Average leads per day
- Average conversion rate
- Average revenue per day
- Total deals created
- Total deals closed
- Customer interaction count

### 4. Variance Analysis

- Total variance calculation
- Min/max variance tracking
- Average variance
- Variance percentage
- Performance status (below/on/above target)

### 5. Trend Analysis

- 30-day historical analysis
- Growth trends
- Performance averages
- Comparative analysis

## Permissions and Access Control

### Zone Isolation

All pricing and reporting data is zone-isolated. Users can only:

- View and manage pricing for their assigned zone
- Submit and view daily closings for their zone
- Super Admins can compare across zones

### Role-Based Access

**Super Admin:**

- Full access to all pricing and reporting features
- Can compare zones
- Can approve reports for any zone

**Zone Admin:**

- Manage pricing for their zone
- Submit and approve daily closings for their zone
- View all reports for their zone

**Manager:**

- View pricing for their zone
- Submit daily closings
- View reports for their zone

**Sales User:**

- View pricing for their zone
- View their own submitted closings
- Limited report access

## Error Handling

### Common Errors

```
400 Bad Request
- Invalid input data
- Validation failures
- Duplicate price list item code
- Leads converted > total leads
- Negative values where not allowed

403 Forbidden
- Insufficient permissions
- Zone access violation
- Role restrictions (approve_reports for non-admins)

404 Not Found
- Price list not found
- Daily closing not found
- Item not found

409 Conflict
- Duplicate daily closing date for zone

500 Internal Server Error
- Database failures
- Calculation errors
- Unexpected system errors
```

## Testing Guide

### Create Price List

```bash
curl -X POST http://localhost:3000/api/v1/pricing/pricelist \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Pricing",
    "currency": "INR",
    "items": [
      {
        "item_name": "Product A",
        "item_code": "PA-001",
        "tier": "standard",
        "unit_price": 5000
      }
    ]
  }'
```

### Submit Daily Closing

```bash
curl -X POST http://localhost:3000/api/v1/reports/daily-closing \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "closing_date": "2024-01-15",
    "total_leads": 30,
    "leads_converted": 8,
    "total_revenue": 800000,
    "projected_revenue": 900000
  }'
```

### Generate Monthly Report

```bash
curl -X POST http://localhost:3000/api/v1/reports/generate \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "includeVariance": true,
    "includeKPIs": true
  }'
```

## Performance Considerations

### Indexing

- zone_id and is_active on price_lists for fast filtering
- price_list_id and created_at on price_list_items for queries
- price_list_id and created_at on pricing_audit for history
- zone_id and closing_date on daily_closings for date range queries

### Pagination

- Default page size: 20
- Maximum page size: 100
- Offset-based pagination

### Query Optimization

- Zone filtering at query layer
- Status filtering at query layer
- Date range filtering at query layer
- Minimal data transfer

## Integration Points

### With Phase 1-4

- Uses authentication from Phase 1
- Uses database service from Phase 1
- Uses audit service from Phase 1
- Uses permissions validator from Phase 1
- Respects zone isolation from all phases

### Dependencies

- DatabaseService for all database operations
- AuditService for audit trail logging
- PermissionsValidator for access control
- Express for HTTP handling

## Future Enhancements

1. **Price Comparison Reports** - Cross-zone pricing analysis
2. **Revenue Forecasting** - ML-based revenue predictions
3. **Budget Tracking** - Budget vs actual comparisons
4. **Alert System** - Notifications for variance thresholds
5. **Export/Import** - CSV/Excel support for pricing
6. **Bulk Updates** - Batch price updates
7. **Price History** - Point-in-time pricing queries
8. **Discount Rules** - Automatic discount application
9. **Commission Tracking** - Sales commission calculation
10. **Report Scheduling** - Automated report generation

## Conclusion

Phase 5 provides a complete pricing and reporting infrastructure for the Zone-Based CRM. The module is fully integrated with the existing authentication, authorization, and audit systems, ensuring consistency across the entire platform.
