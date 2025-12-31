/**
 * Task Controller
 * Handles HTTP requests for task management
 */

import { Request, Response } from "express";
import { TaskService } from "../services/task.service";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  MarkTaskCompleteRequest,
  AddTaskCommentRequest,
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

export class TaskController {
  constructor(private taskService: TaskService) {}

  /**
   * Create a new task
   * POST /api/v1/tasks
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;

      // Check permission
      if (!req.context.capabilities.includes("task:create")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to create task",
        });
        return;
      }

      const data: CreateTaskRequest = req.body;

      const task = await this.taskService.createTask(zoneId, userId, data);

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to create task",
      });
    }
  }

  /**
   * List all tasks for zone with filtering and pagination
   * GET /api/v1/tasks
   */
  async listTasks(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const {
        status,
        priority,
        assigned_to_id,
        assigned_by_id,
        project_id,
        lead_id,
        search,
        due_before,
        due_after,
        overdue_only,
        page = "1",
        pageSize = "20",
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      if (assigned_to_id)
        filters.assigned_to_id = parseInt(assigned_to_id as string, 10);
      if (assigned_by_id)
        filters.assigned_by_id = parseInt(assigned_by_id as string, 10);
      if (project_id) filters.project_id = parseInt(project_id as string, 10);
      if (lead_id) filters.lead_id = parseInt(lead_id as string, 10);
      if (search) filters.search = search as string;
      if (due_before) filters.due_before = due_before as string;
      if (due_after) filters.due_after = due_after as string;
      if (overdue_only === "true") filters.overdue_only = true;

      const pagination = {
        page: Math.max(1, parseInt(page as string, 10) || 1),
        pageSize: Math.min(100, parseInt(pageSize as string, 10) || 20),
      };

      const result = await this.taskService.listTasks(
        zoneId,
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.tasks,
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
        error: error.message || "Failed to list tasks",
      });
    }
  }

  /**
   * Get single task with all details
   * GET /api/v1/tasks/:id
   */
  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      const task = await this.taskService.getTaskWithDetails(taskId, zoneId);

      res.json({
        success: true,
        data: task,
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
          error: error.message || "Failed to retrieve task",
        });
      }
    }
  }

  /**
   * Update task metadata
   * PUT /api/v1/tasks/:id
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("task:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to update task",
        });
        return;
      }

      const data: UpdateTaskRequest = req.body;

      const task = await this.taskService.updateTask(
        taskId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update task",
      });
    }
  }

  /**
   * Mark task as completed
   * POST /api/v1/tasks/:id/complete
   */
  async markComplete(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("task:update")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to complete task",
        });
        return;
      }

      const data: MarkTaskCompleteRequest = req.body;

      const task = await this.taskService.markTaskComplete(
        taskId,
        zoneId,
        userId,
        data
      );

      res.json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to mark task as complete",
      });
    }
  }

  /**
   * Mark task as read by current user
   * POST /api/v1/tasks/:id/mark-read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      await this.taskService.markTaskAsRead(taskId, zoneId, userId);

      res.json({
        success: true,
        message: "Task marked as read",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to mark task as read",
      });
    }
  }

  /**
   * Add comment to task
   * POST /api/v1/tasks/:id/comments
   */
  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      const data: AddTaskCommentRequest = req.body;

      const comment = await this.taskService.addComment(
        taskId,
        zoneId,
        userId,
        data
      );

      res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to add comment",
      });
    }
  }

  /**
   * Delete (cancel) task
   * DELETE /api/v1/tasks/:id
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;
      const taskId = parseInt(req.params.id, 10);

      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          error: "Invalid task ID",
        });
        return;
      }

      // Check permission
      if (!req.context.capabilities.includes("task:delete")) {
        res.status(403).json({
          success: false,
          error: "Insufficient permissions to delete task",
        });
        return;
      }

      await this.taskService.deleteTask(taskId, zoneId, userId);

      res.json({
        success: true,
        message: "Task cancelled successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to delete task",
      });
    }
  }

  /**
   * Get task statistics by status
   * GET /api/v1/tasks/stats/by-status
   */
  async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;

      const stats = await this.taskService.getTaskStatsByStatus(zoneId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve task statistics",
      });
    }
  }

  /**
   * Get overdue tasks
   * GET /api/v1/tasks/overdue
   */
  async getOverdueTasks(req: Request, res: Response): Promise<void> {
    try {
      const { zoneId } = req.context;
      const { limit = "10" } = req.query;

      const overdueTasks = await this.taskService.getOverdueTasks(
        zoneId,
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: overdueTasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve overdue tasks",
      });
    }
  }

  /**
   * Get tasks assigned to current user
   * GET /api/v1/tasks/my-assignments
   */
  async getMyAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { userId, zoneId } = req.context;

      const tasks = await this.taskService.getUserTaskAssignments(
        zoneId,
        userId
      );

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve your task assignments",
      });
    }
  }
}
