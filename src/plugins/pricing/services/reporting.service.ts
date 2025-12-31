/**
 * Reporting Service
 * Manages daily closing reports with KPI calculations and variance analysis
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import {
  DailyClosing,
  KPIMetric,
  VarianceAnalysis,
  ReportSummary,
  CreateDailyClosingRequest,
  UpdateDailyClosingRequest,
  REPORT_PERIOD,
} from "../types";

interface ReportFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ListDailyClosingsResult {
  reports: DailyClosing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ReportGenerationOptions {
  period: REPORT_PERIOD;
  startDate: Date;
  endDate: Date;
  includeVariance?: boolean;
  includeKPIs?: boolean;
}

export class ReportingService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService
  ) {}

  /**
   * Create daily closing report
   */
  async createDailyClosing(
    zoneId: number,
    userId: number,
    data: CreateDailyClosingRequest
  ): Promise<DailyClosing> {
    // Validate closing date
    const closingDate = new Date(data.closing_date);
    if (isNaN(closingDate.getTime())) {
      throw new Error("Invalid closing date");
    }

    // Check if report already exists for this date
    const existingReport = await this.database.execute(
      `SELECT id FROM daily_closings
       WHERE zone_id = ? AND DATE(closing_date) = DATE(?)`,
      [zoneId, closingDate]
    );

    if ((existingReport[0] as any[]).length > 0) {
      throw new Error("Daily closing report already exists for this date");
    }

    // Validate numbers
    if (data.total_leads < 0) {
      throw new Error("Total leads cannot be negative");
    }

    if (data.leads_converted < 0) {
      throw new Error("Leads converted cannot be negative");
    }

    if (data.leads_converted > data.total_leads) {
      throw new Error("Leads converted cannot exceed total leads");
    }

    if (data.total_revenue < 0) {
      throw new Error("Total revenue cannot be negative");
    }

    if (data.projected_revenue < 0) {
      throw new Error("Projected revenue cannot be negative");
    }

    // Calculate conversion rate
    const conversionRate =
      data.total_leads > 0
        ? (data.leads_converted / data.total_leads) * 100
        : 0;

    // Calculate variance
    const revenueVariance = data.total_revenue - data.projected_revenue;
    const variancePercentage =
      data.projected_revenue > 0
        ? (revenueVariance / data.projected_revenue) * 100
        : 0;

    const sql = `
      INSERT INTO daily_closings (
        zone_id, closing_date, total_leads, leads_converted, conversion_rate,
        total_revenue, projected_revenue, revenue_variance, variance_percentage,
        new_deals_created, deals_closed, customer_calls, customer_meetings,
        proposal_sent, proposal_accepted, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      zoneId,
      closingDate,
      data.total_leads,
      data.leads_converted,
      conversionRate,
      data.total_revenue,
      data.projected_revenue,
      revenueVariance,
      variancePercentage,
      data.new_deals_created || 0,
      data.deals_closed || 0,
      data.customer_calls || 0,
      data.customer_meetings || 0,
      data.proposal_sent || 0,
      data.proposal_accepted || 0,
      "draft",
      data.notes || null,
    ]);

    const reportId = (result[0] as any).insertId;

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "create",
      entityType: "daily_closing",
      entityId: reportId,
      oldValue: null,
      newValue: {
        closing_date: closingDate,
        total_leads: data.total_leads,
        leads_converted: data.leads_converted,
      },
    });

    return this.getDailyClosing(reportId, zoneId) as any;
  }

  /**
   * Get daily closing by ID
   */
  async getDailyClosing(
    reportId: number,
    zoneId: number
  ): Promise<DailyClosing | null> {
    const sql = `
      SELECT id, zone_id, closing_date, total_leads, leads_converted, conversion_rate,
             total_revenue, projected_revenue, revenue_variance, variance_percentage,
             new_deals_created, deals_closed, customer_calls, customer_meetings,
             proposal_sent, proposal_accepted, status, notes, approved_by, approved_at,
             created_at, updated_at
      FROM daily_closings
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [reportId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as DailyClosing;
  }

  /**
   * List daily closings with pagination
   */
  async listDailyClosings(
    zoneId: number,
    filters?: ReportFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ListDailyClosingsResult> {
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT id, zone_id, closing_date, total_leads, leads_converted, conversion_rate,
             total_revenue, projected_revenue, revenue_variance, variance_percentage,
             new_deals_created, deals_closed, customer_calls, customer_meetings,
             proposal_sent, proposal_accepted, status, notes, approved_by, approved_at,
             created_at, updated_at
      FROM daily_closings
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    if (filters?.startDate) {
      sql += " AND closing_date >= ?";
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += " AND closing_date <= ?";
      params.push(filters.endDate);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as count FROM"
    );
    const countResult = await this.database.execute(countSql, params);
    const total = (countResult[0] as any[])[0].count;

    // Get paginated results
    sql += " ORDER BY closing_date DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const results = await this.database.execute(sql, params);
    const reports = results[0] as any[] as DailyClosing[];

    return {
      reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update daily closing
   */
  async updateDailyClosing(
    reportId: number,
    zoneId: number,
    userId: number,
    data: UpdateDailyClosingRequest
  ): Promise<DailyClosing> {
    const existing = await this.getDailyClosing(reportId, zoneId);
    if (!existing) {
      throw new Error("Daily closing not found");
    }

    if (existing.status !== "draft") {
      throw new Error("Can only update draft reports");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.total_leads !== undefined) {
      if (data.total_leads < 0) {
        throw new Error("Total leads cannot be negative");
      }
      updates.push("total_leads = ?");
      values.push(data.total_leads);
    }

    if (data.leads_converted !== undefined) {
      if (data.leads_converted < 0) {
        throw new Error("Leads converted cannot be negative");
      }
      const totalLeads = data.total_leads ?? existing.total_leads;
      if (data.leads_converted > totalLeads) {
        throw new Error("Leads converted cannot exceed total leads");
      }
      updates.push("leads_converted = ?");
      values.push(data.leads_converted);
    }

    if (data.total_revenue !== undefined) {
      if (data.total_revenue < 0) {
        throw new Error("Total revenue cannot be negative");
      }
      updates.push("total_revenue = ?");
      values.push(data.total_revenue);
    }

    if (data.projected_revenue !== undefined) {
      if (data.projected_revenue < 0) {
        throw new Error("Projected revenue cannot be negative");
      }
      updates.push("projected_revenue = ?");
      values.push(data.projected_revenue);
    }

    // Update activities if provided
    if (data.new_deals_created !== undefined) {
      updates.push("new_deals_created = ?");
      values.push(data.new_deals_created);
    }

    if (data.deals_closed !== undefined) {
      updates.push("deals_closed = ?");
      values.push(data.deals_closed);
    }

    if (data.customer_calls !== undefined) {
      updates.push("customer_calls = ?");
      values.push(data.customer_calls);
    }

    if (data.customer_meetings !== undefined) {
      updates.push("customer_meetings = ?");
      values.push(data.customer_meetings);
    }

    if (data.proposal_sent !== undefined) {
      updates.push("proposal_sent = ?");
      values.push(data.proposal_sent);
    }

    if (data.proposal_accepted !== undefined) {
      updates.push("proposal_accepted = ?");
      values.push(data.proposal_accepted);
    }

    if (data.notes !== undefined) {
      updates.push("notes = ?");
      values.push(data.notes || null);
    }

    if (updates.length === 0) {
      return existing;
    }

    // Recalculate metrics
    const totalLeads = data.total_leads ?? existing.total_leads;
    const leadsConverted = data.leads_converted ?? existing.leads_converted;
    const totalRevenue = data.total_revenue ?? existing.total_revenue;
    const projectedRevenue =
      data.projected_revenue ?? existing.projected_revenue;

    const conversionRate =
      totalLeads > 0 ? (leadsConverted / totalLeads) * 100 : 0;
    const revenueVariance = totalRevenue - projectedRevenue;
    const variancePercentage =
      projectedRevenue > 0 ? (revenueVariance / projectedRevenue) * 100 : 0;

    updates.push(
      "conversion_rate = ?, revenue_variance = ?, variance_percentage = ?, updated_at = NOW()"
    );
    values.push(
      conversionRate,
      revenueVariance,
      variancePercentage,
      reportId,
      zoneId
    );

    const sql = `UPDATE daily_closings SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "daily_closing",
      entityId: reportId,
      oldValue: existing,
      newValue: data,
    });

    return this.getDailyClosing(reportId, zoneId) as any;
  }

  /**
   * Submit daily closing for approval
   */
  async submitDailyClosing(
    reportId: number,
    zoneId: number,
    userId: number
  ): Promise<DailyClosing> {
    const existing = await this.getDailyClosing(reportId, zoneId);
    if (!existing) {
      throw new Error("Daily closing not found");
    }

    if (existing.status !== "draft") {
      throw new Error("Can only submit draft reports");
    }

    const sql = `
      UPDATE daily_closings
      SET status = 'submitted', updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [reportId, zoneId]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "daily_closing",
      entityId: reportId,
      oldValue: { status: existing.status },
      newValue: { status: "submitted" },
    });

    return this.getDailyClosing(reportId, zoneId) as any;
  }

  /**
   * Approve daily closing (Zone Admin only)
   */
  async approveDailyClosing(
    reportId: number,
    zoneId: number,
    userId: number
  ): Promise<DailyClosing> {
    const existing = await this.getDailyClosing(reportId, zoneId);
    if (!existing) {
      throw new Error("Daily closing not found");
    }

    if (existing.status !== "submitted") {
      throw new Error("Can only approve submitted reports");
    }

    const sql = `
      UPDATE daily_closings
      SET status = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [userId, reportId, zoneId]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "daily_closing",
      entityId: reportId,
      oldValue: { status: existing.status },
      newValue: { status: "approved", approved_by: userId },
    });

    return this.getDailyClosing(reportId, zoneId) as any;
  }

  /**
   * Generate report for period
   */
  async generateReport(
    zoneId: number,
    options: ReportGenerationOptions
  ): Promise<ReportSummary> {
    const {
      period,
      startDate,
      endDate,
      includeVariance = true,
      includeKPIs = true,
    } = options;

    // Get all closings in period
    const sql = `
      SELECT id, closing_date, total_leads, leads_converted, conversion_rate,
             total_revenue, projected_revenue, revenue_variance, variance_percentage,
             new_deals_created, deals_closed, customer_calls, customer_meetings,
             proposal_sent, proposal_accepted
      FROM daily_closings
      WHERE zone_id = ? AND closing_date >= ? AND closing_date <= ? AND status = 'approved'
      ORDER BY closing_date ASC
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      startDate,
      endDate,
    ]);
    const closings = results[0] as any[] as DailyClosing[];

    if (closings.length === 0) {
      return {
        period,
        startDate,
        endDate,
        totalDays: 0,
        summary: {
          totalLeads: 0,
          leadsConverted: 0,
          conversionRate: 0,
          totalRevenue: 0,
          projectedRevenue: 0,
          revenueVariance: 0,
          variancePercentage: 0,
        },
        kpis: [],
        variance: null,
        dailyData: [],
      };
    }

    // Calculate summary metrics
    const totalDays = closings.length;
    const totalLeads = closings.reduce((sum, c) => sum + c.total_leads, 0);
    const leadsConverted = closings.reduce(
      (sum, c) => sum + c.leads_converted,
      0
    );
    const totalRevenue = closings.reduce((sum, c) => sum + c.total_revenue, 0);
    const projectedRevenue = closings.reduce(
      (sum, c) => sum + c.projected_revenue,
      0
    );
    const revenueVariance = totalRevenue - projectedRevenue;
    const variancePercentage =
      projectedRevenue > 0 ? (revenueVariance / projectedRevenue) * 100 : 0;
    const conversionRate =
      totalLeads > 0 ? (leadsConverted / totalLeads) * 100 : 0;

    // Calculate KPIs
    const kpis: KPIMetric[] = [];

    if (includeKPIs) {
      const avgLeadsPerDay = totalDays > 0 ? totalLeads / totalDays : 0;
      const avgConversion =
        totalDays > 0
          ? closings.reduce((sum, c) => sum + c.conversion_rate, 0) / totalDays
          : 0;
      const avgRevenuePerDay = totalDays > 0 ? totalRevenue / totalDays : 0;
      const totalDealsCreated = closings.reduce(
        (sum, c) => sum + c.new_deals_created,
        0
      );
      const totalDealsClosed = closings.reduce(
        (sum, c) => sum + c.deals_closed,
        0
      );
      const totalCustomerCalls = closings.reduce(
        (sum, c) => sum + c.customer_calls,
        0
      );
      const totalCustomerMeetings = closings.reduce(
        (sum, c) => sum + c.customer_meetings,
        0
      );

      kpis.push(
        {
          metric: "avg_leads_per_day",
          value: Math.round(avgLeadsPerDay * 100) / 100,
          status: "calculated",
          trend: 0,
        },
        {
          metric: "avg_conversion_rate",
          value: Math.round(avgConversion * 100) / 100,
          status: "calculated",
          trend: 0,
        },
        {
          metric: "avg_revenue_per_day",
          value: Math.round(avgRevenuePerDay * 100) / 100,
          status: "calculated",
          trend: 0,
        },
        {
          metric: "deals_created",
          value: totalDealsCreated,
          status: "calculated",
          trend: 0,
        },
        {
          metric: "deals_closed",
          value: totalDealsClosed,
          status: "calculated",
          trend: 0,
        },
        {
          metric: "customer_interactions",
          value: totalCustomerCalls + totalCustomerMeetings,
          status: "calculated",
          trend: 0,
        }
      );
    }

    // Calculate variance analysis
    let variance: VarianceAnalysis | null = null;
    if (includeVariance && closings.length > 0) {
      const revenueVariances = closings.map((c) => c.revenue_variance);
      const minVariance = Math.min(...revenueVariances);
      const maxVariance = Math.max(...revenueVariances);
      const avgVariance =
        revenueVariances.reduce((sum, v) => sum + v, 0) / closings.length;

      variance = {
        totalVariance: revenueVariance,
        minVariance,
        maxVariance,
        avgVariance: Math.round(avgVariance * 100) / 100,
        variancePercentage,
        status:
          variancePercentage < -10
            ? "below_target"
            : variancePercentage > 10
            ? "above_target"
            : "on_target",
      };
    }

    return {
      period,
      startDate,
      endDate,
      totalDays,
      summary: {
        totalLeads,
        leadsConverted,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue,
        projectedRevenue,
        revenueVariance,
        variancePercentage: Math.round(variancePercentage * 100) / 100,
      },
      kpis,
      variance,
      dailyData: closings,
    };
  }

  /**
   * Compare performance across multiple zones
   */
  async compareZonePerformance(
    zoneIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const placeholders = zoneIds.map(() => "?").join(",");
    const sql = `
      SELECT zone_id,
             COUNT(*) as total_reports,
             SUM(total_leads) as total_leads,
             SUM(leads_converted) as leads_converted,
             AVG(conversion_rate) as avg_conversion_rate,
             SUM(total_revenue) as total_revenue,
             SUM(projected_revenue) as projected_revenue,
             SUM(revenue_variance) as revenue_variance
      FROM daily_closings
      WHERE zone_id IN (${placeholders})
        AND closing_date >= ? AND closing_date <= ?
        AND status = 'approved'
      GROUP BY zone_id
      ORDER BY total_revenue DESC
    `;

    const params = [...zoneIds, startDate, endDate];
    const results = await this.database.execute(sql, params);

    return (results[0] as any[]).map((row) => ({
      ...row,
      conversion_rate: Math.round(row.avg_conversion_rate * 100) / 100,
      variance_percentage:
        row.projected_revenue > 0
          ? Math.round(
              (row.revenue_variance / row.projected_revenue) * 100 * 100
            ) / 100
          : 0,
    }));
  }

  /**
   * Get trend analysis for zone
   */
  async getTrendAnalysis(zoneId: number, days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sql = `
      SELECT closing_date, total_leads, leads_converted, conversion_rate,
             total_revenue, projected_revenue, revenue_variance
      FROM daily_closings
      WHERE zone_id = ? AND closing_date >= ? AND closing_date <= ? AND status = 'approved'
      ORDER BY closing_date ASC
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      startDate,
      endDate,
    ]);
    const data = results[0] as any[];

    if (data.length === 0) {
      return { period: days, data: [], averages: {} };
    }

    // Calculate trend
    const firstHalf = data.slice(0, Math.ceil(data.length / 2));
    const secondHalf = data.slice(Math.ceil(data.length / 2));

    const calculateAvg = (arr: any[], field: string) =>
      arr.length > 0
        ? arr.reduce((sum, row) => sum + row[field], 0) / arr.length
        : 0;

    const trend = {
      leads:
        calculateAvg(secondHalf, "total_leads") -
        calculateAvg(firstHalf, "total_leads"),
      conversion:
        calculateAvg(secondHalf, "conversion_rate") -
        calculateAvg(firstHalf, "conversion_rate"),
      revenue:
        calculateAvg(secondHalf, "total_revenue") -
        calculateAvg(firstHalf, "total_revenue"),
    };

    return {
      period: days,
      data,
      trend,
      averages: {
        leads: Math.round(calculateAvg(data, "total_leads") * 100) / 100,
        conversion:
          Math.round(calculateAvg(data, "conversion_rate") * 100) / 100,
        revenue: Math.round(calculateAvg(data, "total_revenue") * 100) / 100,
      },
    };
  }
}
