/**
 * Pricing Controller
 * Handles HTTP requests for pricing operations
 */

import { Request, Response } from "express";
import { PricingService } from "../services/pricing.service";
import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { PermissionsValidator } from "@core/permissions/permissions.validator";
import {
  CreatePriceListRequest,
  UpdatePriceListRequest,
  AddPriceListItemRequest,
  UpdatePriceListItemRequest,
} from "../types";

export class PricingController {
  private pricingService: PricingService;

  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService,
    private permissionsValidator: PermissionsValidator
  ) {
    this.pricingService = new PricingService(database, auditLogger);
  }

  /**
   * Create price list
   * POST /api/v1/pricing/pricelist
   */
  async createPriceList(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const data = req.body as CreatePriceListRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage pricing",
        });
        return;
      }

      const priceList = await this.pricingService.createPriceList(
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        message: "Price list created successfully",
        data: priceList,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create price list",
      });
    }
  }

  /**
   * Get price list by ID
   * GET /api/v1/pricing/pricelist/:id
   */
  async getPriceList(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view pricing",
        });
        return;
      }

      const priceList = await this.pricingService.getPriceListWithItems(
        parseInt(id),
        zoneId
      );

      res.status(200).json({
        success: true,
        data: priceList,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Price list not found",
      });
    }
  }

  /**
   * List price lists
   * GET /api/v1/pricing/pricelist
   */
  async listPriceLists(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const isActive = req.query.isActive
        ? req.query.isActive === "true"
        : undefined;
      const search = req.query.search as string | undefined;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view pricing",
        });
        return;
      }

      const result = await this.pricingService.listPriceLists(
        zoneId,
        { is_active: isActive, search },
        { page, pageSize }
      );

      res.status(200).json({
        success: true,
        data: result.priceLists,
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
        message: error.message || "Failed to list price lists",
      });
    }
  }

  /**
   * Update price list
   * PUT /api/v1/pricing/pricelist/:id
   */
  async updatePriceList(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;
      const data = req.body as UpdatePriceListRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage pricing",
        });
        return;
      }

      const updated = await this.pricingService.updatePriceList(
        parseInt(id),
        zoneId,
        userId,
        data
      );

      res.status(200).json({
        success: true,
        message: "Price list updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update price list",
      });
    }
  }

  /**
   * Add item to price list
   * POST /api/v1/pricing/pricelist/:id/items
   */
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;
      const data = req.body as AddPriceListItemRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage pricing",
        });
        return;
      }

      const item = await this.pricingService.addItem(
        parseInt(id),
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        message: "Item added to price list successfully",
        data: item,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add item",
      });
    }
  }

  /**
   * Update price list item
   * PUT /api/v1/pricing/pricelist/:priceListId/items/:itemId
   */
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { priceListId, itemId } = req.params;
      const data = req.body as UpdatePriceListItemRequest;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage pricing",
        });
        return;
      }

      const updated = await this.pricingService.updateItem(
        parseInt(itemId),
        parseInt(priceListId),
        zoneId,
        userId,
        data
      );

      res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update item",
      });
    }
  }

  /**
   * Delete price list
   * DELETE /api/v1/pricing/pricelist/:id
   */
  async deletePriceList(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "manage_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to manage pricing",
        });
        return;
      }

      await this.pricingService.deletePriceList(parseInt(id), zoneId, userId);

      res.status(200).json({
        success: true,
        message: "Price list deleted successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete price list",
      });
    }
  }

  /**
   * Get pricing audit history
   * GET /api/v1/pricing/pricelist/:id/audit
   */
  async getPricingAudit(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_audit"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view audit logs",
        });
        return;
      }

      const audit = await this.pricingService.getPricingAuditHistory(
        parseInt(id),
        zoneId,
        limit
      );

      res.status(200).json({
        success: true,
        data: audit,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch audit history",
      });
    }
  }

  /**
   * Compare pricing across price lists
   * GET /api/v1/pricing/compare?itemCode=CODE
   */
  async comparePricing(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId, userId } = res.locals.auth;
      const { itemCode } = req.query;

      if (!itemCode) {
        res.status(400).json({
          success: false,
          message: "Item code is required",
        });
        return;
      }

      // Permission check
      if (
        !(await this.permissionsValidator.hasCapability(
          userId,
          zoneId,
          "view_pricing"
        ))
      ) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view pricing",
        });
        return;
      }

      const comparison = await this.pricingService.comparePriceLists(
        zoneId,
        itemCode as string
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to compare pricing",
      });
    }
  }
}
