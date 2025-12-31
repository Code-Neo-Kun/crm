/**
 * Pricing Plugin Routes
 * Defines all pricing and reporting endpoints
 */

import { Router, Request, Response, NextFunction } from "express";
import { PricingController } from "./controllers/pricing.controller";
import { ReportingController } from "./controllers/reporting.controller";
import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { PermissionsValidator } from "@core/permissions/permissions.validator";

export function createPricingRoutes(
  database: DatabaseService,
  auditLogger: AuditService,
  permissionsValidator: PermissionsValidator
): Router {
  const router = Router();
  const pricingController = new PricingController(
    database,
    auditLogger,
    permissionsValidator
  );
  const reportingController = new ReportingController(
    database,
    auditLogger,
    permissionsValidator
  );

  /**
   * Pricing Routes
   * Price list management with versioning and audit trails
   */

  // Create price list
  router.post(
    "/pricelist",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.createPriceList(req, res).catch(next);
    }
  );

  // Get price list by ID with items
  router.get(
    "/pricelist/:id",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.getPriceList(req, res).catch(next);
    }
  );

  // List price lists
  router.get(
    "/pricelist",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.listPriceLists(req, res).catch(next);
    }
  );

  // Update price list
  router.put(
    "/pricelist/:id",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.updatePriceList(req, res).catch(next);
    }
  );

  // Delete price list
  router.delete(
    "/pricelist/:id",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.deletePriceList(req, res).catch(next);
    }
  );

  // Add item to price list
  router.post(
    "/pricelist/:id/items",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.addItem(req, res).catch(next);
    }
  );

  // Update item in price list
  router.put(
    "/pricelist/:priceListId/items/:itemId",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.updateItem(req, res).catch(next);
    }
  );

  // Get pricing audit history
  router.get(
    "/pricelist/:id/audit",
    (req: Request, res: Response, next: NextFunction) => {
      pricingController.getPricingAudit(req, res).catch(next);
    }
  );

  // Compare pricing across price lists
  router.get("/compare", (req: Request, res: Response, next: NextFunction) => {
    pricingController.comparePricing(req, res).catch(next);
  });

  /**
   * Reporting Routes
   * Daily closing with KPI tracking and variance analysis
   */

  // Create daily closing report
  router.post(
    "/daily-closing",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.createDailyClosing(req, res).catch(next);
    }
  );

  // Get daily closing by ID
  router.get(
    "/daily-closing/:id",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.getDailyClosing(req, res).catch(next);
    }
  );

  // List daily closings
  router.get(
    "/daily-closing",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.listDailyClosings(req, res).catch(next);
    }
  );

  // Update daily closing
  router.put(
    "/daily-closing/:id",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.updateDailyClosing(req, res).catch(next);
    }
  );

  // Submit daily closing for approval
  router.post(
    "/daily-closing/:id/submit",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.submitDailyClosing(req, res).catch(next);
    }
  );

  // Approve daily closing
  router.post(
    "/daily-closing/:id/approve",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.approveDailyClosing(req, res).catch(next);
    }
  );

  // Generate report for period
  router.post(
    "/generate",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.generateReport(req, res).catch(next);
    }
  );

  // Compare zone performance
  router.post(
    "/compare-zones",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.compareZonePerformance(req, res).catch(next);
    }
  );

  // Get trend analysis
  router.get(
    "/trend-analysis",
    (req: Request, res: Response, next: NextFunction) => {
      reportingController.getTrendAnalysis(req, res).catch(next);
    }
  );

  return router;
}

/**
 * Export routes configuration
 */
export default createPricingRoutes;
