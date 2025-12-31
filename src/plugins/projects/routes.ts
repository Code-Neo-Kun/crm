/**
 * Project Routes
 * Combines pipeline and project routes for the projects plugin
 */

import { Router } from "express";
import { authenticate } from "@core/auth/middleware/authenticate";
import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { PermissionValidator } from "@core/permissions/services/permission-validator";
import { PipelineController } from "./controllers/pipeline.controller";
import { ProjectController } from "./controllers/project.controller";
import { PipelineService } from "./services/pipeline.service";
import { ProjectService } from "./services/project.service";

const router = Router();

// Middleware
router.use(authenticate);

// Initialize services
const database = DatabaseService.getInstance();
const auditLogger = AuditService.getInstance();
const permissionValidator = PermissionValidator.getInstance();

const pipelineService = new PipelineService(
  database,
  auditLogger,
  permissionValidator
);

const projectService = new ProjectService(database, auditLogger);

// Initialize controllers
const pipelineController = new PipelineController(pipelineService);
const projectController = new ProjectController(projectService);

// ============================================================================
// PIPELINE ROUTES
// ============================================================================

// GET /api/v1/pipelines - List all pipelines for zone
router.get("/pipelines", (req, res) =>
  pipelineController.listPipelines(req, res)
);

// POST /api/v1/pipelines - Create new pipeline
router.post("/pipelines", (req, res) =>
  pipelineController.createPipeline(req, res)
);

// GET /api/v1/pipelines/:id - Get pipeline details
router.get("/pipelines/:id", (req, res) =>
  pipelineController.getPipeline(req, res)
);

// PUT /api/v1/pipelines/:id - Update pipeline
router.put("/pipelines/:id", (req, res) =>
  pipelineController.updatePipeline(req, res)
);

// DELETE /api/v1/pipelines/:id - Deactivate pipeline
router.delete("/pipelines/:id", (req, res) =>
  pipelineController.deletePipeline(req, res)
);

// POST /api/v1/pipelines/:id/stages - Add stage to pipeline
router.post("/pipelines/:id/stages", (req, res) =>
  pipelineController.addStage(req, res)
);

// PUT /api/v1/pipelines/:pipeline_id/stages/:stage_id - Update stage
router.put("/pipelines/:pipeline_id/stages/:stage_id", (req, res) =>
  pipelineController.updateStage(req, res)
);

// ============================================================================
// PROJECT ROUTES
// ============================================================================

// GET /api/v1/projects/stats/by-status - Project statistics
router.get("/projects/stats/by-status", (req, res) =>
  projectController.getProjectStats(req, res)
);

// GET /api/v1/projects - List all projects for zone
router.get("/projects", (req, res) => projectController.listProjects(req, res));

// POST /api/v1/projects - Create new project
router.post("/projects", (req, res) =>
  projectController.createProject(req, res)
);

// POST /api/v1/projects/convert-lead/:leadId - Convert lead to project
router.post("/projects/convert-lead/:leadId", (req, res) =>
  projectController.convertLeadToProject(req, res)
);

// GET /api/v1/projects/:id - Get project details
router.get("/projects/:id", (req, res) =>
  projectController.getProject(req, res)
);

// PUT /api/v1/projects/:id - Update project
router.put("/projects/:id", (req, res) =>
  projectController.updateProject(req, res)
);

// POST /api/v1/projects/:id/transition - Transition to stage
router.post("/projects/:id/transition", (req, res) =>
  projectController.transitionStage(req, res)
);

// GET /api/v1/projects/:id/activities - Get project activities
router.get("/projects/:id/activities", (req, res) =>
  projectController.getActivities(req, res)
);

// DELETE /api/v1/projects/:id - Cancel project
router.delete("/projects/:id", (req, res) =>
  projectController.deleteProject(req, res)
);

export default router;
