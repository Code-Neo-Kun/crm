# Phase 5 API Quick Reference

## Pricing Endpoints

### Price Lists

| Method | Endpoint                         | Description               | Requires       |
| ------ | -------------------------------- | ------------------------- | -------------- |
| POST   | `/api/v1/pricing/pricelist`      | Create new price list     | manage_pricing |
| GET    | `/api/v1/pricing/pricelist`      | List all price lists      | view_pricing   |
| GET    | `/api/v1/pricing/pricelist/{id}` | Get price list with items | view_pricing   |
| PUT    | `/api/v1/pricing/pricelist/{id}` | Update price list         | manage_pricing |
| DELETE | `/api/v1/pricing/pricelist/{id}` | Delete price list         | manage_pricing |

### Price List Items

| Method | Endpoint                                                 | Description            | Requires       |
| ------ | -------------------------------------------------------- | ---------------------- | -------------- |
| POST   | `/api/v1/pricing/pricelist/{id}/items`                   | Add item to price list | manage_pricing |
| PUT    | `/api/v1/pricing/pricelist/{priceListId}/items/{itemId}` | Update item            | manage_pricing |

### Pricing Management

| Method | Endpoint                                | Description                  | Requires     |
| ------ | --------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/pricing/pricelist/{id}/audit`  | Get pricing audit history    | view_audit   |
| GET    | `/api/v1/pricing/compare?itemCode=CODE` | Compare pricing across lists | view_pricing |

## Reporting Endpoints

### Daily Closings

| Method | Endpoint                                     | Description          | Requires        |
| ------ | -------------------------------------------- | -------------------- | --------------- |
| POST   | `/api/v1/reports/daily-closing`              | Create daily closing | manage_reports  |
| GET    | `/api/v1/reports/daily-closing`              | List daily closings  | view_reports    |
| GET    | `/api/v1/reports/daily-closing/{id}`         | Get daily closing    | view_reports    |
| PUT    | `/api/v1/reports/daily-closing/{id}`         | Update daily closing | manage_reports  |
| POST   | `/api/v1/reports/daily-closing/{id}/submit`  | Submit for approval  | manage_reports  |
| POST   | `/api/v1/reports/daily-closing/{id}/approve` | Approve report       | approve_reports |

### Analytics & Reporting

| Method | Endpoint                         | Description                 | Requires         |
| ------ | -------------------------------- | --------------------------- | ---------------- |
| POST   | `/api/v1/reports/generate`       | Generate period report      | view_reports     |
| GET    | `/api/v1/reports/trend-analysis` | Get trend analysis          | view_reports     |
| POST   | `/api/v1/reports/compare-zones`  | Compare zones (Super Admin) | Super Admin role |

## Common Payloads

### Create Price List

```json
{
  "name": "Q1 2024 Pricing",
  "description": "Optional description",
  "currency": "INR",
  "items": [
    {
      "item_name": "Service Name",
      "item_code": "CODE",
      "tier": "standard|professional|enterprise|custom",
      "unit_price": 10000,
      "quantity_breakpoint": 100,
      "discount_percentage": 5,
      "description": "Optional"
    }
  ]
}
```

### Create Daily Closing

```json
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
  "notes": "Optional notes"
}
```

### Generate Report

```json
{
  "period": "daily|weekly|monthly|quarterly|yearly",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "includeVariance": true,
  "includeKPIs": true
}
```

## Validation Constraints

### Price List Item

- **item_name**: 1-150 characters
- **item_code**: 1-50 characters (unique per list)
- **tier**: standard, professional, enterprise, or custom
- **unit_price**: 0-999999.99
- **discount_percentage**: 0-100

### Daily Closing

- **closing_date**: Valid date (no future dates)
- **total_leads**: >= 0
- **leads_converted**: 0 to total_leads
- **total_revenue**: >= 0
- **projected_revenue**: >= 0
- **activities**: >= 0

## Status Codes

| Code | Meaning      | Example                      |
| ---- | ------------ | ---------------------------- |
| 201  | Created      | Price list created           |
| 200  | Success      | Price list retrieved         |
| 400  | Bad Request  | Invalid input                |
| 403  | Forbidden    | Insufficient permissions     |
| 404  | Not Found    | Price list not found         |
| 409  | Conflict     | Duplicate daily closing date |
| 500  | Server Error | Database error               |

## Tips

1. **Price Comparisons**: Use `GET /pricing/compare?itemCode=CODE` to see how prices vary across price lists
2. **Report Periods**: Use `generate` endpoint with different periods for multi-level analysis
3. **Trend Analysis**: Check 30-day trend to identify performance patterns
4. **Variance Status**: Responses include status (below_target/on_target/above_target)
5. **Pagination**: Default 20 items per page, adjust with `pageSize` parameter

## Permission Mapping

```
manage_pricing      → Create/update/delete price lists
view_pricing        → View price lists and items
manage_reports      → Create/submit/update daily closings
view_reports        → View reports and analytics
approve_reports     → Approve submitted reports (Zone Admin+)
view_audit          → View pricing audit trails
```

## Example Workflow

1. **Create Price List**

   ```
   POST /api/v1/pricing/pricelist
   ```

2. **Add Items to List**

   ```
   POST /api/v1/pricing/pricelist/{id}/items
   ```

3. **Submit Daily Closing**

   ```
   POST /api/v1/reports/daily-closing
   ```

4. **Submit for Approval**

   ```
   POST /api/v1/reports/daily-closing/{id}/submit
   ```

5. **Zone Admin Approves**

   ```
   POST /api/v1/reports/daily-closing/{id}/approve
   ```

6. **Generate Monthly Report**
   ```
   POST /api/v1/reports/generate
   ```

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "uuid"
  }
}
```

## Success Response Format

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
