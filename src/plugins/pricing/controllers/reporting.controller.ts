/**
 * Reporting Controller
 * Handles HTTP requests for reporting operations
 */

import { Request, Response } from "express";
import { ReportingService } from "../services/reporting.service";
import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { PermissionsValidator } from "@core/permissions/permissions.validator";
import {
  CreateDailyClosingRequest,
  UpdateDailyClosingRequest,
  REPORT_PERIOD,
} from "../types";

export class ReportingController {
  private reportingService: ReportingService;

  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService,
    private permissionsValidator: PermissionsValidator
  ) {
    this.reportingService = new ReportingService(database, auditLogger);
  }

  /**
   * Create daily closing report
   * POST /api/v1/reports/daily-closing
   */
  async createDailyClosing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const data = req.body as CreateDailyClosingRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage reports",
        });
        return;
      }

      const report = await this.reportingService.createDailyClosing(
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        message: "Daily closing report created successfully",
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create daily closing",
      });
    }
  }

  /**
   * Get daily closing by ID
   * GET /api/v1/reports/daily-closing/:id
   */
  async getDailyClosing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view reports",
        });
        return;
      }

      const report = await this.reportingService.getDailyClosing(
        parseInt(id),
        zoneId
      );

      if (!report) {
        res.status(404).json({
          success: false,
          message: "Daily closing report not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch daily closing",
      });
    }
  }

  /**
   * List daily closings
   * GET /api/v1/reports/daily-closing
   */
  async listDailyClosings(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view reports",
        });
        return;
      }

      const result = await this.reportingService.listDailyClosings(
        zoneId,
        { status, startDate, endDate },
        page,
        pageSize
      );

      res.status(200).json({
        success: true,
        data: result.reports,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to list daily closings",
      });
    }
  }

  /**
   * Update daily closing
   * PUT /api/v1/reports/daily-closing/:id
   */
  async updateDailyClosing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;
      const data = req.body as UpdateDailyClosingRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage reports",
        });
        return;
      }

      const updated = await this.reportingService.updateDailyClosing(
        parseInt(id),
        zoneId,
        userId,
        data
      );

      res.status(200).json({
        success: true,
        message: "Daily closing updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update daily closing",
      });
    }
  }

  /**
   * Submit daily closing for approval
   * POST /api/v1/reports/daily-closing/:id/submit
   */
  async submitDailyClosing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage reports",
        });
        return;
      }

      const updated = await this.reportingService.submitDailyClosing(
        parseInt(id),
        zoneId,
        userId
      );

      res.status(200).json({
        success: true,
        message: "Daily closing submitted for approval",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to submit daily closing",
      });
    }
  }

  /**
   * Approve daily closing (Zone Admin only)
   * POST /api/v1/reports/daily-closing/:id/approve
   */
  async approveDailyClosing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId, role } = res.locals.auth;
      const { id } = req.params;

      // Permission check - Zone Admin only
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "approve_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message:
            "Insufficient permissions to approve reports (Zone Admin only)",
        });
        return;
      }

      const updated = await this.reportingService.approveDailyClosing(
        parseInt(id),
        zoneId,
        userId
      );

      res.status(200).json({
        success: true,
        message: "Daily closing approved successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to approve daily closing",
      });
    }
  }

  /**
   * Generate report for period
   * POST /api/v1/reports/generate
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const {
        period,
        startDate,
        endDate,
        includeVariance = true,
        includeKPIs = true,
      } = req.body;

      // Validate period
      if (!Object.values(REPORT_PERIOD).includes(period)) {
        res.status(400).json({
          success: false,
          message: "Invalid report period",
        });
        return;
      }

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view reports",
        });
        return;
      }

      const report = await this.reportingService.generateReport(zoneId, {
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includeVariance,
        includeKPIs,
      });

      res.status(200).json({
        success: true,
        message: "Report generated successfully",
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to generate report",
      });
    }
  }

  /**
   * Compare zone performance
   * POST /api/v1/reports/compare-zones
   */
  async compareZonePerformance(req: Request, res: Response): Promise<void> {
    try {
      const { userId, role } = res.locals.auth;
      const { zoneIds, startDate, endDate } = req.body;

      if (!zoneIds || zoneIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Zone IDs are required",
        });
        return;
      }

      // Permission check - Super Admin only
      if (role !== "super_admin") {
        res.status(403).json({
          success: false,
          message: "Only Super Admins can compare zone performance",
        });
        return;
      }

      const comparison = await this.reportingService.compareZonePerformance(
        zoneIds,
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        message: "Zone comparison generated successfully",
        data: comparison,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to compare zones",
      });
    }
  }

  /**
   * Get trend analysis for zone
   * GET /api/v1/reports/trend-analysis?days=30
   */
  async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const days = parseInt(req.query.days as string) || 30;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_reports"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view reports",
        });
        return;
      }

      const analysis = await this.reportingService.getTrendAnalysis(
        zoneId,
        days
      );

      res.status(200).json({
        success: true,
        message: "Trend analysis generated successfully",
        data: analysis,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate trend analysis",
      });
    }
  }
}
