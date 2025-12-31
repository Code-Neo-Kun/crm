import { Request, Response } from "express";
import leadService from "../services/lead.service";
import permissionValidator from "@core/permissions/services/permission-validator";
import auditLogger from "@core/audit/services/audit.service";
import {
  CreateLeadRequest,
  UpdateLeadRequest,
  AssignLeadRequest,
  AddActivityRequest,
  ACTIVITY_TYPES,
} from "../types";
import logger from "@utils/logger";

class LeadController {
  /**
   * POST /api/v1/leads
   * Create a new lead (auto-assigns to user's primary zone)
   */
  async createLead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Check capability
      const hasCapability = await permissionValidator.hasCapability(
        req.context.userId,
        "lead.create"
      );

      if (!hasCapability) {
        await auditLogger.logDenial(
          req.context.primaryZoneId,
          req.context.userId,
          "Missing lead.create capability",
          "lead",
          0,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You do not have permission to create leads",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const data = req.body as CreateLeadRequest;

      // Validate input
      if (!data.companyName || !data.contactName) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Company name and contact name are required",
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Create lead (auto-assigns to primary zone)
      const lead = await leadService.createLead(
        req.context.primaryZoneId,
        req.context.userId,
        data
      );

      res.status(201).json({
        success: true,
        data: lead,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Create lead error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to create lead",
          statusCode: 500,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * GET /api/v1/leads
   * List leads (zone-filtered)
   */
  async listLeads(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Check capability
      const hasCapability = await permissionValidator.hasCapability(
        req.context.userId,
        "lead.read"
      );

      if (!hasCapability) {
        res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You do not have permission to view leads",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const zoneId = parseInt(
        (req.query.zoneId as string) || String(req.context.primaryZoneId)
      );
      const status = req.query.status as string | undefined;
      const owner = req.query.owner
        ? parseInt(req.query.owner as string)
        : undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string)
        : 20;

      // Verify zone access
      const canAccess = req.context.accessibleZones.includes(zoneId);
      if (!canAccess) {
        await auditLogger.logDenial(
          zoneId,
          req.context.userId,
          "Cross-zone access denied",
          "lead",
          0,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "ZONE_MISMATCH",
            message: "You do not have access to this zone",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const result = await leadService.listLeads(
        zoneId,
        { status, owner, search },
        { page, pageSize }
      );

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          ...result.meta,
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("List leads error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to list leads",
          statusCode: 500,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * GET /api/v1/leads/:leadId
   * Get lead details with activities
   */
  async getLead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const leadId = parseInt(req.params.leadId);
      const zoneId = parseInt(
        (req.query.zoneId as string) || String(req.context.primaryZoneId)
      );

      // Verify zone access
      const canAccess = req.context.accessibleZones.includes(zoneId);
      if (!canAccess) {
        await auditLogger.logDenial(
          zoneId,
          req.context.userId,
          "Cross-zone access denied",
          "lead",
          leadId,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "ZONE_MISMATCH",
            message: "You do not have access to this zone",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const lead = await leadService.getLeadWithDetails(leadId, zoneId);

      res.status(200).json({
        success: true,
        data: lead,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Get lead error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;
      const code = statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error.message || "Failed to fetch lead",
          statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * PUT /api/v1/leads/:leadId
   * Update lead
   */
  async updateLead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const leadId = parseInt(req.params.leadId);
      const zoneId = parseInt(
        (req.query.zoneId as string) || String(req.context.primaryZoneId)
      );

      // Verify zone access
      const canAccess = req.context.accessibleZones.includes(zoneId);
      if (!canAccess) {
        await auditLogger.logDenial(
          zoneId,
          req.context.userId,
          "Cross-zone access denied",
          "lead",
          leadId,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "ZONE_MISMATCH",
            message: "You do not have access to this zone",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Check capability
      const hasCapability = await permissionValidator.hasCapability(
        req.context.userId,
        "lead.edit"
      );

      if (!hasCapability) {
        res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: "You do not have permission to edit leads",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const data = req.body as UpdateLeadRequest;

      const lead = await leadService.updateLead(
        leadId,
        zoneId,
        req.context.userId,
        data
      );

      res.status(200).json({
        success: true,
        data: lead,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Update lead error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;
      const code = statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error.message || "Failed to update lead",
          statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * POST /api/v1/leads/:leadId/assign
   * Assign lead to another user (same zone only)
   */
  async assignLead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const leadId = parseInt(req.params.leadId);
      const zoneId = parseInt(
        (req.query.zoneId as string) || String(req.context.primaryZoneId)
      );

      // Verify zone access
      const canAccess = req.context.accessibleZones.includes(zoneId);
      if (!canAccess) {
        await auditLogger.logDenial(
          zoneId,
          req.context.userId,
          "Cross-zone access denied",
          "lead",
          leadId,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "ZONE_MISMATCH",
            message: "You do not have access to this zone",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Check assignment capability
      const canAssign = await permissionValidator.canAssignToUser(
        req.context.userId,
        (req.body as AssignLeadRequest).newOwnerId,
        zoneId
      );

      if (!canAssign.allowed) {
        await auditLogger.logDenial(
          zoneId,
          req.context.userId,
          canAssign.reason || "Assignment not allowed",
          "lead",
          leadId,
          req.context.ipAddress,
          req.context.userAgent
        );

        res.status(403).json({
          success: false,
          error: {
            code: "PERMISSION_DENIED",
            message: canAssign.reason || "You cannot assign this lead",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const request = req.body as AssignLeadRequest;

      if (!request.newOwnerId) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "newOwnerId is required",
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const lead = await leadService.assignLead(
        leadId,
        zoneId,
        req.context.userId,
        request
      );

      res.status(200).json({
        success: true,
        data: lead,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Assign lead error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;
      const code = statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error.message || "Failed to assign lead",
          statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * POST /api/v1/leads/:leadId/activities
   * Add activity to lead
   */
  async addActivity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const leadId = parseInt(req.params.leadId);
      const zoneId = parseInt(
        (req.query.zoneId as string) || String(req.context.primaryZoneId)
      );

      // Verify zone access
      const canAccess = req.context.accessibleZones.includes(zoneId);
      if (!canAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: "ZONE_MISMATCH",
            message: "You do not have access to this zone",
            statusCode: 403,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const request = req.body as AddActivityRequest;

      if (!request.type || !request.description) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "type and description are required",
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      if (!ACTIVITY_TYPES.includes(request.type)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid activity type. Allowed: ${ACTIVITY_TYPES.join(
              ", "
            )}`,
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const activity = await leadService.addActivity(
        leadId,
        req.context.userId,
        request.type,
        request.description
      );

      res.status(201).json({
        success: true,
        data: activity,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Add activity error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to add activity",
          statusCode: 500,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }
}

export default new LeadController();
