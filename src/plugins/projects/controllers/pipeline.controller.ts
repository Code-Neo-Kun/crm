/**
 * Pipeline Controller
 * Handles HTTP requests for pipeline management
 */

import { Request, Response } from "express";
import { PipelineService } from "../services/pipeline.service";
import { CreatePipelineRequest, UpdatePipelineRequest } from "../types";

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

export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  /**
   * Create a new pipeline with stages
   * POST /api/v1/pipelines
   */
  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;

      // Check permission
      if (!req.context.capabilities.includes("pipeline:create")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to create pipeline",
        });
        return;
      }

      const data: CreatePipelineRequest = req.body;

      const pipeline = await this.pipelineService.createPipeline(
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        data: pipeline,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create pipeline",
      });
    }
  }

  /**
   * Get all pipelines for a zone
   * GET /api/v1/pipelines
   */
  async listPipelines(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const { type, is_active } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (is_active !== undefined) filters.is_active = is_active === "true";

      const pipelines = await this.pipelineService.listPipelines(
        zoneId,
        filters
      );

      res.json({
        success: true,
        data: pipelines,
        count: pipelines.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to list pipelines",
      });
    }
  }

  /**
   * Get single pipeline with stages
   * GET /api/v1/pipelines/:id
   */
  async getPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const pipelineId = parseInt(req.params.id, 10);

      if (isNaN(pipelineId)) {
        res.status(400).json({
          success: false,
          error: "Invalid pipeline ID",
        });
        return;
      }

      const pipeline = await this.pipelineService.getPipelineById(
        pipelineId,
        zoneId
      );

      if (!pipeline) {
        res.status(404).json({
          success: false,
          error: "Pipeline not found",
        });
        return;
      }

      res.json({
        success: true,
        data: pipeline,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve pipeline",
      });
    }
  }

  /**
   * Update pipeline metadata
   * PUT /api/v1/pipelines/:id
   */
  async updatePipeline(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const pipelineId = parseInt(req.params.id, 10);

      if (isNaN(pipelineId)) {
        res.status(400).json({
          success: false,
          error: "Invalid pipeline ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("pipeline:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to update pipeline",
        });
        return;
      }

      const data: UpdatePipelineRequest = req.body;

      const pipeline = await this.pipelineService.updatePipeline(
        pipelineId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: pipeline,
      });
    } catch (error: any) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || "Failed to update pipeline",
        });
      }
    }
  }

  /**
   * Delete (deactivate) pipeline
   * DELETE /api/v1/pipelines/:id
   */
  async deletePipeline(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const pipelineId = parseInt(req.params.id, 10);

      if (isNaN(pipelineId)) {
        res.status(400).json({
          success: false,
          error: "Invalid pipeline ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("pipeline:delete")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to delete pipeline",
        });
        return;
      }

      await this.pipelineService.deletePipeline(pipelineId, zoneId, userId);

      res.json({
        success: true,
        message: "Pipeline deactivated successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to delete pipeline",
      });
    }
  }

  /**
   * Add stage to existing pipeline
   * POST /api/v1/pipelines/:id/stages
   */
  async addStage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const pipelineId = parseInt(req.params.id, 10);

      if (isNaN(pipelineId)) {
        res.status(400).json({
          success: false,
          error: "Invalid pipeline ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("pipeline:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to modify pipeline",
        });
        return;
      }

      const { stage_name, sequence, is_final, description } = req.body;

      const stage = await this.pipelineService.addStage(
        pipelineId,
        zoneId,
        userId,
        stage_name,
        sequence,
        is_final,
        description
      );

      res.status(201).json({
        success: true,
        data: stage,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to add stage",
      });
    }
  }

  /**
   * Update pipeline stage
   * PUT /api/v1/pipelines/:pipeline_id/stages/:stage_id
   */
  async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const pipelineId = parseInt(req.params.pipeline_id, 10);
      const stageId = parseInt(req.params.stage_id, 10);

      if (isNaN(pipelineId) || isNaN(stageId)) {
        res.status(400).json({
          success: false,
          error: "Invalid pipeline or stage ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("pipeline:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to modify pipeline",
        });
        return;
      }

      const updates = req.body;

      const stage = await this.pipelineService.updateStage(
        stageId,
        pipelineId,
        zoneId,
        userId,
        updates
      );

      res.json({
        success: true,
        data: stage,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update stage",
      });
    }
  }
}
