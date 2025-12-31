/**
 * Task Service
 * Manages task creation, lifecycle, assignment, and read status tracking
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import {
  Task,
  TaskWithDetails,
  TaskComment,
  TaskReadStatus,
  CreateTaskRequest,
  UpdateTaskRequest,
  MarkTaskCompleteRequest,
  AddTaskCommentRequest,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_VALIDATION_RULES,
} from "../types";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface TaskFilters {
  status?: TASK_STATUSES;
  priority?: TASK_PRIORITIES;
  assigned_to_id?: number;
  project_id?: number;
  lead_id?: number;
  assigned_by_id?: number;
  search?: string;
  due_before?: string; // ISO date
  due_after?: string; // ISO date
  overdue_only?: boolean;
}

interface ListTasksResult {
  tasks: TaskWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class TaskService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService
  ) {}

  /**
   * Create a new task
   */
  async createTask(
    zoneId: number,
    userId: number,
    data: CreateTaskRequest
  ): Promise<TaskWithDetails> {
    // Validation
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Task title is required");
    }

    if (data.title.length > TASK_VALIDATION_RULES.title_max_length) {
      throw new Error(
        `Task title must not exceed ${TASK_VALIDATION_RULES.title_max_length} characters`
      );
    }

    if (
      data.description &&
      data.description.length > TASK_VALIDATION_RULES.description_max_length
    ) {
      throw new Error(
        `Task description must not exceed ${TASK_VALIDATION_RULES.description_max_length} characters`
      );
    }

    const priority = data.priority || TASK_PRIORITIES.MEDIUM;
    if (!Object.values(TASK_PRIORITIES).includes(priority)) {
      throw new Error(`Invalid task priority: ${priority}`);
    }

    // Check assigned user if provided
    if (data.assigned_to_id) {
      const userCheck = await this.database.execute(
        `SELECT u.id FROM users u
         JOIN user_zones uz ON u.id = uz.user_id
         WHERE u.id = ? AND uz.zone_id = ?`,
        [data.assigned_to_id, zoneId]
      );

      if ((userCheck[0] as any[]).length === 0) {
        throw new Error("Assigned user not found in this zone");
      }
    }

    // Check project if provided
    if (data.project_id) {
      const projectCheck = await this.database.execute(
        "SELECT id FROM projects WHERE id = ? AND zone_id = ?",
        [data.project_id, zoneId]
      );

      if ((projectCheck[0] as any[]).length === 0) {
        throw new Error("Project not found in this zone");
      }
    }

    // Check lead if provided
    if (data.lead_id) {
      const leadCheck = await this.database.execute(
        "SELECT id FROM leads WHERE id = ? AND zone_id = ?",
        [data.lead_id, zoneId]
      );

      if ((leadCheck[0] as any[]).length === 0) {
        throw new Error("Lead not found in this zone");
      }
    }

    // Validate due date if provided
    let dueDate = null;
    if (data.due_date) {
      const dueDateObj = new Date(data.due_date);
      if (isNaN(dueDateObj.getTime())) {
        throw new Error("Invalid due_date format");
      }
      dueDate = data.due_date;
    }

    // Create task
    const sql = `
      INSERT INTO tasks (
        zone_id, title, description, priority, status,
        assigned_to_id, assigned_by_id, project_id, lead_id, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      zoneId,
      data.title.trim(),
      data.description || null,
      priority,
      TASK_STATUSES.TODO,
      data.assigned_to_id || null,
      userId,
      data.project_id || null,
      data.lead_id || null,
      dueDate,
    ]);

    const taskId = (result[0] as any).insertId;

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "create",
      entityType: "task",
      entityId: taskId,
      oldValue: null,
      newValue: {
        title: data.title,
        priority,
        assigned_to_id: data.assigned_to_id || null,
      },
    });

    return this.getTaskWithDetails(taskId, zoneId);
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: number, zoneId: number): Promise<Task | null> {
    const sql = `
      SELECT id, zone_id, title, description, priority, status,
             assigned_to_id, assigned_by_id, project_id, lead_id,
             due_date, completed_at, created_at, updated_at
      FROM tasks
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [taskId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as Task;
  }

  /**
   * Get task with full details
   */
  async getTaskWithDetails(
    taskId: number,
    zoneId: number
  ): Promise<TaskWithDetails> {
    const task = await this.getTaskById(taskId, zoneId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Get assigned user details
    let assigned_to;
    if (task.assigned_to_id) {
      const assignedResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [task.assigned_to_id]
      );
      assigned_to = (assignedResult[0] as any[])[0];
    }

    // Get assigner details
    let assigned_by;
    if (task.assigned_by_id) {
      const assignerResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [task.assigned_by_id]
      );
      assigned_by = (assignerResult[0] as any[])[0];
    }

    // Get project details
    let project;
    if (task.project_id) {
      const projectResult = await this.database.execute(
        "SELECT id, name FROM projects WHERE id = ? AND zone_id = ?",
        [task.project_id, zoneId]
      );
      project = (projectResult[0] as any[])[0];
    }

    // Get lead details
    let lead;
    if (task.lead_id) {
      const leadResult = await this.database.execute(
        "SELECT id, name, email FROM leads WHERE id = ? AND zone_id = ?",
        [task.lead_id, zoneId]
      );
      const leadData = (leadResult[0] as any[])[0];
      if (leadData) {
        lead = {
          id: leadData.id,
          name: leadData.name || "Unknown",
          email: leadData.email || null,
        };
      }
    }

    // Get read status
    const readStatusResult = await this.database.execute(
      "SELECT id, task_id, user_id, read_at FROM task_read_status WHERE task_id = ?",
      [taskId]
    );
    const read_by = readStatusResult[0] as any[] as TaskReadStatus[];

    // Get comments
    const commentsResult = await this.database.execute(
      `SELECT id, task_id, user_id, comment, created_at, updated_at
       FROM task_comments WHERE task_id = ? ORDER BY created_at DESC`,
      [taskId]
    );

    const comments = [];
    for (const comment of commentsResult[0] as any[]) {
      const userResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [comment.user_id]
      );
      comments.push({
        ...comment,
        user: (userResult[0] as any[])[0],
      });
    }

    return {
      ...task,
      assigned_to,
      assigned_by,
      project,
      lead,
      read_by,
      comments,
    };
  }

  /**
   * List tasks with pagination and filtering
   */
  async listTasks(
    zoneId: number,
    filters?: TaskFilters,
    pagination?: PaginationParams
  ): Promise<ListTasksResult> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT id, zone_id, title, description, priority, status,
             assigned_to_id, assigned_by_id, project_id, lead_id,
             due_date, completed_at, created_at, updated_at
      FROM tasks
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    if (filters?.priority) {
      sql += " AND priority = ?";
      params.push(filters.priority);
    }

    if (filters?.assigned_to_id) {
      sql += " AND assigned_to_id = ?";
      params.push(filters.assigned_to_id);
    }

    if (filters?.assigned_by_id) {
      sql += " AND assigned_by_id = ?";
      params.push(filters.assigned_by_id);
    }

    if (filters?.project_id) {
      sql += " AND project_id = ?";
      params.push(filters.project_id);
    }

    if (filters?.lead_id) {
      sql += " AND lead_id = ?";
      params.push(filters.lead_id);
    }

    if (filters?.search) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters?.due_before) {
      sql += " AND due_date <= ?";
      params.push(filters.due_before);
    }

    if (filters?.due_after) {
      sql += " AND due_date >= ?";
      params.push(filters.due_after);
    }

    if (filters?.overdue_only) {
      sql += " AND due_date < NOW() AND status != ?";
      params.push(TASK_STATUSES.COMPLETED);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as count FROM"
    );
    const countResult = await this.database.execute(countSql, params);
    const total = (countResult[0] as any[])[0].count;

    // Get paginated results
    sql +=
      " ORDER BY priority DESC, due_date ASC, created_at DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const results = await this.database.execute(sql, params);
    const tasks = results[0] as any[] as Task[];

    // Hydrate with details
    const tasksWithDetails: TaskWithDetails[] = [];
    for (const task of tasks) {
      const details = await this.getTaskWithDetails(task.id, zoneId);
      tasksWithDetails.push(details);
    }

    return {
      tasks: tasksWithDetails,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update task metadata
   */
  async updateTask(
    taskId: number,
    zoneId: number,
    userId: number,
    data: UpdateTaskRequest
  ): Promise<TaskWithDetails> {
    const existing = await this.getTaskById(taskId, zoneId);
    if (!existing) {
      throw new Error("Task not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new Error("Task title cannot be empty");
      }
      if (data.title.length > TASK_VALIDATION_RULES.title_max_length) {
        throw new Error(
          `Task title must not exceed ${TASK_VALIDATION_RULES.title_max_length} characters`
        );
      }
      updates.push("title = ?");
      values.push(data.title.trim());
    }

    if (data.description !== undefined) {
      if (
        data.description &&
        data.description.length > TASK_VALIDATION_RULES.description_max_length
      ) {
        throw new Error(
          `Task description must not exceed ${TASK_VALIDATION_RULES.description_max_length} characters`
        );
      }
      updates.push("description = ?");
      values.push(data.description || null);
    }

    if (data.priority !== undefined) {
      if (!Object.values(TASK_PRIORITIES).includes(data.priority)) {
        throw new Error(`Invalid task priority: ${data.priority}`);
      }
      updates.push("priority = ?");
      values.push(data.priority);
    }

    if (data.assigned_to_id !== undefined) {
      if (data.assigned_to_id !== null) {
        const userCheck = await this.database.execute(
          `SELECT u.id FROM users u
           JOIN user_zones uz ON u.id = uz.user_id
           WHERE u.id = ? AND uz.zone_id = ?`,
          [data.assigned_to_id, zoneId]
        );

        if ((userCheck[0] as any[]).length === 0) {
          throw new Error("User not found in this zone");
        }
      }
      updates.push("assigned_to_id = ?");
      values.push(data.assigned_to_id || null);
    }

    if (data.status !== undefined) {
      if (!Object.values(TASK_STATUSES).includes(data.status)) {
        throw new Error(`Invalid task status: ${data.status}`);
      }
      updates.push("status = ?");
      values.push(data.status);
    }

    if (data.due_date !== undefined) {
      if (data.due_date) {
        const dueDateObj = new Date(data.due_date);
        if (isNaN(dueDateObj.getTime())) {
          throw new Error("Invalid due_date format");
        }
      }
      updates.push("due_date = ?");
      values.push(data.due_date || null);
    }

    if (updates.length === 0) {
      return this.getTaskWithDetails(taskId, zoneId);
    }

    updates.push("updated_at = NOW()");
    values.push(taskId, zoneId);

    const sql = `UPDATE tasks SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "task",
      entityId: taskId,
      oldValue: existing,
      newValue: data,
    });

    return this.getTaskWithDetails(taskId, zoneId);
  }

  /**
   * Mark task as complete
   */
  async markTaskComplete(
    taskId: number,
    zoneId: number,
    userId: number,
    data?: MarkTaskCompleteRequest
  ): Promise<TaskWithDetails> {
    const task = await this.getTaskById(taskId, zoneId);
    if (!task) {
      throw new Error("Task not found");
    }

    const completedAt = data?.completed_at || new Date().toISOString();

    const sql = `
      UPDATE tasks
      SET status = ?, completed_at = ?, updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [
      TASK_STATUSES.COMPLETED,
      completedAt,
      taskId,
      zoneId,
    ]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "task",
      entityId: taskId,
      oldValue: { status: task.status },
      newValue: { status: TASK_STATUSES.COMPLETED },
    });

    return this.getTaskWithDetails(taskId, zoneId);
  }

  /**
   * Mark task as read by user
   */
  async markTaskAsRead(
    taskId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const task = await this.getTaskById(taskId, zoneId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Check if already read
    const existingRead = await this.database.execute(
      "SELECT id FROM task_read_status WHERE task_id = ? AND user_id = ?",
      [taskId, userId]
    );

    if ((existingRead[0] as any[]).length === 0) {
      const sql = `
        INSERT INTO task_read_status (task_id, user_id, read_at)
        VALUES (?, ?, NOW())
      `;

      await this.database.execute(sql, [taskId, userId]);
    }
  }

  /**
   * Add comment to task
   */
  async addComment(
    taskId: number,
    zoneId: number,
    userId: number,
    data: AddTaskCommentRequest
  ): Promise<TaskComment> {
    const task = await this.getTaskById(taskId, zoneId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (!data.comment || data.comment.trim().length === 0) {
      throw new Error("Comment cannot be empty");
    }

    const sql = `
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES (?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      taskId,
      userId,
      data.comment.trim(),
    ]);

    const commentId = (result[0] as any).insertId;

    // Get user details
    const userResult = await this.database.execute(
      "SELECT id, name, email FROM users WHERE id = ?",
      [userId]
    );

    return {
      id: commentId,
      task_id: taskId,
      user_id: userId,
      comment: data.comment.trim(),
      created_at: new Date(),
      updated_at: new Date(),
      user: (userResult[0] as any[])[0],
    };
  }

  /**
   * Delete task (soft delete to cancelled status)
   */
  async deleteTask(
    taskId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const task = await this.getTaskById(taskId, zoneId);
    if (!task) {
      throw new Error("Task not found");
    }

    const sql = `
      UPDATE tasks
      SET status = ?, updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [TASK_STATUSES.CANCELLED, taskId, zoneId]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "delete",
      entityType: "task",
      entityId: taskId,
      oldValue: { id: taskId },
      newValue: null,
    });
  }

  /**
   * Get task statistics by status
   */
  async getTaskStatsByStatus(zoneId: number): Promise<Record<string, number>> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE zone_id = ? AND status != ?
      GROUP BY status
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      TASK_STATUSES.CANCELLED,
    ]);

    const stats: Record<string, number> = {};
    for (const row of results[0] as any[]) {
      stats[row.status] = row.count;
    }

    return stats;
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(
    zoneId: number,
    limit: number = 10
  ): Promise<TaskWithDetails[]> {
    const sql = `
      SELECT id, zone_id, title, description, priority, status,
             assigned_to_id, assigned_by_id, project_id, lead_id,
             due_date, completed_at, created_at, updated_at
      FROM tasks
      WHERE zone_id = ? AND due_date < NOW() 
            AND status != ? AND status != ?
      ORDER BY due_date ASC
      LIMIT ?
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      TASK_STATUSES.COMPLETED,
      TASK_STATUSES.CANCELLED,
      limit,
    ]);

    const tasks = results[0] as any[] as Task[];

    const overdueTasks: TaskWithDetails[] = [];
    for (const task of tasks) {
      const details = await this.getTaskWithDetails(task.id, zoneId);
      overdueTasks.push(details);
    }

    return overdueTasks;
  }

  /**
   * Get task assignments for user
   */
  async getUserTaskAssignments(
    zoneId: number,
    userId: number
  ): Promise<TaskWithDetails[]> {
    const sql = `
      SELECT id, zone_id, title, description, priority, status,
             assigned_to_id, assigned_by_id, project_id, lead_id,
             due_date, completed_at, created_at, updated_at
      FROM tasks
      WHERE zone_id = ? AND assigned_to_id = ? AND status != ?
      ORDER BY priority DESC, due_date ASC
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      userId,
      TASK_STATUSES.CANCELLED,
    ]);

    const tasks = results[0] as any[] as Task[];

    const userTasks: TaskWithDetails[] = [];
    for (const task of tasks) {
      const details = await this.getTaskWithDetails(task.id, zoneId);
      userTasks.push(details);
    }

    return userTasks;
  }
}
