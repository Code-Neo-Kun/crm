import { Router } from "express";
import { authenticate } from "@core/auth/middleware/authenticate";
import leadController from "./controllers/lead.controller";

const router = Router();

/**
 * Lead Routes
 * All routes require authentication
 */

// POST /api/v1/leads - Create lead
router.post("/", authenticate, (req, res) => {
  leadController.createLead(req, res);
});

// GET /api/v1/leads - List leads
router.get("/", authenticate, (req, res) => {
  leadController.listLeads(req, res);
});

// GET /api/v1/leads/:leadId - Get lead details
router.get("/:leadId", authenticate, (req, res) => {
  leadController.getLead(req, res);
});

// PUT /api/v1/leads/:leadId - Update lead
router.put("/:leadId", authenticate, (req, res) => {
  leadController.updateLead(req, res);
});

// POST /api/v1/leads/:leadId/assign - Assign lead
router.post("/:leadId/assign", authenticate, (req, res) => {
  leadController.assignLead(req, res);
});

// POST /api/v1/leads/:leadId/activities - Add activity
router.post("/:leadId/activities", authenticate, (req, res) => {
  leadController.addActivity(req, res);
});

export default router;
