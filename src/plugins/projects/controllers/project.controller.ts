/**
 * Project Controller
 * Handles HTTP requests for project management
 */

import { Request, Response } from "express";
import { ProjectService } from "../services/project.service";
import {
  CreateProjectRequest,
  UpdateProjectRequest,
  TransitionStageRequest,
} from "../types";

declare global {
  namespace Express {
    interface Request {
      context: {
        userId: number;
        zoneId: number;
        accessibleZones: number[];
        capabilities: string[];
        role: string;
      };
    }
  }
}

export class ProjectController {
  constructor(private projectService: ProjectService) {}

  /**
   * Create a new project
   * POST /api/v1/projects
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;

      // Check permission
      if (!req.context.capabilities.includes("project:create")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to create project",
        });
        return;
      }

      const data: CreateProjectRequest = req.body;

      const project = await this.projectService.createProject(
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create project",
      });
    }
  }

  /**
   * List all projects for zone with filtering and pagination
   * GET /api/v1/projects
   */
  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const {
        status,
        pipeline_id,
        owner_id,
        assigned_to_id,
        search,
        page = "1",
        pageSize = "20",
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (pipeline_id)
        filters.pipeline_id = parseInt(pipeline_id as string, 10);
      if (owner_id) filters.owner_id = parseInt(owner_id as string, 10);
      if (assigned_to_id)
        filters.assigned_to_id = parseInt(assigned_to_id as string, 10);
      if (search) filters.search = search as string;

      const pagination = {
        page: Math.max(1, parseInt(page as string, 10) || 1),
        pageSize: Math.min(100, parseInt(pageSize as string, 10) || 20),
      };

      const result = await this.projectService.listProjects(
        zoneId,
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.projects,
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
        error: error.message || "Failed to list projects",
      });
    }
  }

  /**
   * Get single project with all details
   * GET /api/v1/projects/:id
   */
  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const projectId = parseInt(req.params.id, 10);

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID",
        });
        return;
      }

      const project = await this.projectService.getProjectWithDetails(
        projectId,
        zoneId
      );

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || "Failed to retrieve project",
        });
      }
    }
  }

  /**
   * Update project metadata
   * PUT /api/v1/projects/:id
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const projectId = parseInt(req.params.id, 10);

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("project:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to update project",
        });
        return;
      }

      const data: UpdateProjectRequest = req.body;

      const project = await this.projectService.updateProject(
        projectId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update project",
      });
    }
  }

  /**
   * Transition project to different stage
   * POST /api/v1/projects/:id/transition
   */
  async transitionStage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const projectId = parseInt(req.params.id, 10);

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("project:transition")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to transition project",
        });
        return;
      }

      const data: TransitionStageRequest = req.body;

      const project = await this.projectService.transitionStage(
        projectId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to transition project",
      });
    }
  }

  /**
   * Get project activities timeline
   * GET /api/v1/projects/:id/activities
   */
  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const projectId = parseInt(req.params.id, 10);

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID",
        });
        return;
      }

      const activities = await this.projectService.getProjectActivities(
        projectId
      );

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve activities",
      });
    }
  }

  /**
   * Delete (cancel) project
   * DELETE /api/v1/projects/:id
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const projectId = parseInt(req.params.id, 10);

      if (isNaN(projectId)) {
        res.status(400).json({
          success: false,
          error: "Invalid project ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("project:delete")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to delete project",
        });
        return;
      }

      await this.projectService.deleteProject(projectId, zoneId, userId);

      res.json({
        success: true,
        message: "Project cancelled successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to delete project",
      });
    }
  }

  /**
   * Convert lead to project
   * POST /api/v1/projects/convert-lead/:leadId
   */
  async convertLeadToProject(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const leadId = parseInt(req.params.leadId, 10);

      if (isNaN(leadId)) {
        res.status(400).json({
          success: false,
          error: "Invalid lead ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("project:create")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to create project",
        });
        return;
      }

      const { pipeline_id, initial_stage_id } = req.body;

      if (!pipeline_id || !initial_stage_id) {
        res.status(400).json({
          success: false,
          error: "pipeline_id and initial_stage_id are required",
        });
        return;
      }

      const project = await this.projectService.convertLeadToProject(
        leadId,
        zoneId,
        userId,
        pipeline_id,
        initial_stage_id
      );

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to convert lead",
      });
    }
  }

  /**
   * Get project statistics by status
   * GET /api/v1/projects/stats/by-status
   */
  async getProjectStats(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;

      const stats = await this.projectService.getProjectCountByStatus(zoneId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve project statistics",
      });
    }
  }
}
