/**
 * Project Service
 * Manages project creation, lifecycle, stage transitions, and activities
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import {
  Project,
  ProjectWithDetails,
  ProjectActivity,
  CreateProjectRequest,
  UpdateProjectRequest,
  TransitionStageRequest,
  PROJECT_STATUSES,
  PipelineStage,
} from "../types";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface ProjectFilters {
  status?: PROJECT_STATUSES;
  pipeline_id?: number;
  owner_id?: number;
  assigned_to_id?: number;
  search?: string;
}

interface ListProjectsResult {
  projects: ProjectWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ProjectService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService
  ) {}

  /**
   * Create a new project (optionally from a lead)
   */
  async createProject(
    zoneId: number,
    userId: number,
    data: CreateProjectRequest
  ): Promise<ProjectWithDetails> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Project name is required");
    }

    if (data.name.length > 255) {
      throw new Error("Project name must not exceed 255 characters");
    }

    if (!data.pipeline_id || data.pipeline_id <= 0) {
      throw new Error("Valid pipeline_id is required");
    }

    if (!data.current_stage_id || data.current_stage_id <= 0) {
      throw new Error("Valid current_stage_id is required");
    }

    // Check if lead exists (if provided)
    if (data.lead_id) {
      const leadCheck = await this.database.execute(
        "SELECT id FROM leads WHERE id = ? AND zone_id = ?",
        [data.lead_id, zoneId]
      );

      if ((leadCheck[0] as any[]).length === 0) {
        throw new Error("Lead not found in this zone");
      }
    }

    // Check if pipeline exists in zone
    const pipelineCheck = await this.database.execute(
      "SELECT id FROM pipelines WHERE id = ? AND zone_id = ?",
      [data.pipeline_id, zoneId]
    );

    if ((pipelineCheck[0] as any[]).length === 0) {
      throw new Error("Pipeline not found in this zone");
    }

    // Check if stage exists and belongs to pipeline
    const stageCheck = await this.database.execute(
      `SELECT id FROM pipeline_stages
       WHERE id = ? AND pipeline_id = ?`,
      [data.current_stage_id, data.pipeline_id]
    );

    if ((stageCheck[0] as any[]).length === 0) {
      throw new Error("Stage does not belong to the specified pipeline");
    }

    // Check assigned user if provided
    if (data.assigned_to_id) {
      const assigneeCheck = await this.database.execute(
        `SELECT u.id FROM users u
         JOIN user_zones uz ON u.id = uz.user_id
         WHERE u.id = ? AND uz.zone_id = ?`,
        [data.assigned_to_id, zoneId]
      );

      if ((assigneeCheck[0] as any[]).length === 0) {
        throw new Error("Assigned user not found in this zone");
      }
    }

    // Insert project
    const sql = `
      INSERT INTO projects (
        zone_id, pipeline_id, lead_id, name, current_stage_id,
        status, owner_id, assigned_to_id, value, currency, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      zoneId,
      data.pipeline_id,
      data.lead_id || null,
      data.name.trim(),
      data.current_stage_id,
      "new",
      userId,
      data.assigned_to_id || null,
      data.value || null,
      data.currency || "INR",
      data.notes || null,
    ]);

    const projectId = (result[0] as any).insertId;

    // Log initial activity
    await this.addActivity(
      projectId,
      "created",
      `Project created by ${userId}`,
      userId,
      null,
      data.current_stage_id
    );

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "create",
      entityType: "project",
      entityId: projectId,
      oldValue: null,
      newValue: {
        name: data.name,
        pipeline_id: data.pipeline_id,
        lead_id: data.lead_id || null,
      },
    });

    return this.getProjectWithDetails(projectId, zoneId);
  }

  /**
   * Get project by ID with all details
   */
  async getProjectById(
    projectId: number,
    zoneId: number
  ): Promise<Project | null> {
    const sql = `
      SELECT id, zone_id, pipeline_id, lead_id, name, current_stage_id,
             status, owner_id, assigned_to_id, value, currency, notes,
             created_at, updated_at
      FROM projects
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [projectId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as Project;
  }

  /**
   * Get project with full details (relationships and activities)
   */
  async getProjectWithDetails(
    projectId: number,
    zoneId: number
  ): Promise<ProjectWithDetails> {
    const project = await this.getProjectById(projectId, zoneId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Get stage details
    const stageResult = await this.database.execute(
      `SELECT id, pipeline_id, stage_name, sequence, is_final, description, created_at, updated_at
       FROM pipeline_stages WHERE id = ?`,
      [project.current_stage_id]
    );

    const stage = (stageResult[0] as any[])[0];

    // Get pipeline details
    const pipelineResult = await this.database.execute(
      `SELECT id, zone_id, name, type, description, is_active, created_by, created_at, updated_at
       FROM pipelines WHERE id = ? AND zone_id = ?`,
      [project.pipeline_id, zoneId]
    );

    const pipeline = (pipelineResult[0] as any[])[0];

    // Get owner details
    const ownerResult = await this.database.execute(
      "SELECT id, name, email FROM users WHERE id = ?",
      [project.owner_id]
    );

    const owner = (ownerResult[0] as any[])[0];

    // Get assigned user details
    let assigned_to;
    if (project.assigned_to_id) {
      const assignedResult = await this.database.execute(
        "SELECT id, name, email FROM users WHERE id = ?",
        [project.assigned_to_id]
      );
      assigned_to = (assignedResult[0] as any[])[0];
    }

    // Get lead details
    let lead;
    if (project.lead_id) {
      const leadResult = await this.database.execute(
        "SELECT id, name, email FROM leads WHERE id = ? AND zone_id = ?",
        [project.lead_id, zoneId]
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

    // Get activities
    const activities = await this.getProjectActivities(projectId);

    return {
      ...project,
      current_stage: stage,
      pipeline,
      owner,
      assigned_to,
      lead,
      activities,
    };
  }

  /**
   * List projects with pagination and filtering
   */
  async listProjects(
    zoneId: number,
    filters?: ProjectFilters,
    pagination?: PaginationParams
  ): Promise<ListProjectsResult> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT id, zone_id, pipeline_id, lead_id, name, current_stage_id,
             status, owner_id, assigned_to_id, value, currency, notes,
             created_at, updated_at
      FROM projects
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    }

    if (filters?.pipeline_id) {
      sql += " AND pipeline_id = ?";
      params.push(filters.pipeline_id);
    }

    if (filters?.owner_id) {
      sql += " AND owner_id = ?";
      params.push(filters.owner_id);
    }

    if (filters?.assigned_to_id) {
      sql += " AND assigned_to_id = ?";
      params.push(filters.assigned_to_id);
    }

    if (filters?.search) {
      sql += " AND (name LIKE ? OR notes LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as count FROM"
    );
    const countResult = await this.database.execute(countSql, params);
    const total = (countResult[0] as any[])[0].count;

    // Get paginated results
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const results = await this.database.execute(sql, params);
    const projects = results[0] as any[] as Project[];

    // Hydrate with details
    const projectsWithDetails: ProjectWithDetails[] = [];
    for (const project of projects) {
      const details = await this.getProjectWithDetails(project.id, zoneId);
      projectsWithDetails.push(details);
    }

    return {
      projects: projectsWithDetails,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update project metadata
   */
  async updateProject(
    projectId: number,
    zoneId: number,
    userId: number,
    data: UpdateProjectRequest
  ): Promise<ProjectWithDetails> {
    const existing = await this.getProjectById(projectId, zoneId);
    if (!existing) {
      throw new Error("Project not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("Project name cannot be empty");
      }
      updates.push("name = ?");
      values.push(data.name.trim());
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

    if (data.value !== undefined) {
      updates.push("value = ?");
      values.push(data.value || null);
    }

    if (data.notes !== undefined) {
      updates.push("notes = ?");
      values.push(data.notes || null);
    }

    if (data.status !== undefined) {
      if (!Object.values(PROJECT_STATUSES).includes(data.status)) {
        throw new Error(`Invalid project status: ${data.status}`);
      }
      updates.push("status = ?");
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.getProjectWithDetails(projectId, zoneId);
    }

    updates.push("updated_at = NOW()");
    values.push(projectId, zoneId);

    const sql = `UPDATE projects SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "project",
      entityId: projectId,
      oldValue: existing,
      newValue: data,
    });

    return this.getProjectWithDetails(projectId, zoneId);
  }

  /**
   * Transition project to a different stage
   */
  async transitionStage(
    projectId: number,
    zoneId: number,
    userId: number,
    data: TransitionStageRequest
  ): Promise<ProjectWithDetails> {
    const project = await this.getProjectById(projectId, zoneId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify new stage exists and belongs to project's pipeline
    const stageCheck = await this.database.execute(
      `SELECT id, is_final FROM pipeline_stages
       WHERE id = ? AND pipeline_id = ?`,
      [data.to_stage_id, project.pipeline_id]
    );

    if ((stageCheck[0] as any[]).length === 0) {
      throw new Error(
        "Target stage does not belong to this project's pipeline"
      );
    }

    const newStage = (stageCheck[0] as any[])[0];

    // Update project stage
    const sql = `
      UPDATE projects
      SET current_stage_id = ?, updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [data.to_stage_id, projectId, zoneId]);

    // Add activity log
    await this.addActivity(
      projectId,
      "stage_transition",
      data.notes ||
        `Project transitioned from stage ${project.current_stage_id} to ${data.to_stage_id}`,
      userId,
      project.current_stage_id,
      data.to_stage_id
    );

    // If moving to final stage, consider updating status
    if (newStage.is_final && project.status !== PROJECT_STATUSES.COMPLETED) {
      await this.database.execute(
        `UPDATE projects SET status = ?, updated_at = NOW()
         WHERE id = ? AND zone_id = ?`,
        [PROJECT_STATUSES.COMPLETED, projectId, zoneId]
      );
    }

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "project",
      entityId: projectId,
      oldValue: {
        current_stage_id: project.current_stage_id,
      },
      newValue: {
        current_stage_id: data.to_stage_id,
      },
    });

    return this.getProjectWithDetails(projectId, zoneId);
  }

  /**
   * Get project activities timeline
   */
  async getProjectActivities(projectId: number): Promise<ProjectActivity[]> {
    const sql = `
      SELECT id, project_id, activity_type, description, performed_by,
             from_stage_id, to_stage_id, created_at
      FROM project_activities
      WHERE project_id = ?
      ORDER BY created_at DESC
    `;

    const results = await this.database.execute(sql, [projectId]);
    return results[0] as any[] as ProjectActivity[];
  }

  /**
   * Add activity to project
   */
  private async addActivity(
    projectId: number,
    activityType: string,
    description: string,
    performedBy: number,
    fromStageId: number | null,
    toStageId: number | null
  ): Promise<void> {
    const sql = `
      INSERT INTO project_activities (
        project_id, activity_type, description, performed_by,
        from_stage_id, to_stage_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.database.execute(sql, [
      projectId,
      activityType,
      description,
      performedBy,
      fromStageId,
      toStageId,
    ]);
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(
    projectId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const project = await this.getProjectById(projectId, zoneId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Mark as cancelled instead of deleting
    await this.database.execute(
      `UPDATE projects SET status = ?, updated_at = NOW()
       WHERE id = ? AND zone_id = ?`,
      [PROJECT_STATUSES.CANCELLED, projectId, zoneId]
    );

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "delete",
      entityType: "project",
      entityId: projectId,
      oldValue: { id: projectId },
      newValue: null,
    });
  }

  /**
   * Get project count by status
   */
  async getProjectCountByStatus(
    zoneId: number
  ): Promise<Record<string, number>> {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE zone_id = ? AND status != ?
      GROUP BY status
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      PROJECT_STATUSES.CANCELLED,
    ]);

    const counts: Record<string, number> = {};
    for (const row of results[0] as any[]) {
      counts[row.status] = row.count;
    }

    return counts;
  }

  /**
   * Convert lead to project
   */
  async convertLeadToProject(
    leadId: number,
    zoneId: number,
    userId: number,
    pipelineId: number,
    initialStageId: number
  ): Promise<ProjectWithDetails> {
    // Verify lead exists
    const leadCheck = await this.database.execute(
      `SELECT id, name, value FROM leads WHERE id = ? AND zone_id = ?`,
      [leadId, zoneId]
    );

    if ((leadCheck[0] as any[]).length === 0) {
      throw new Error("Lead not found");
    }

    const lead = (leadCheck[0] as any[])[0];

    // Create project from lead
    const createData: CreateProjectRequest = {
      pipeline_id: pipelineId,
      name: lead.name,
      current_stage_id: initialStageId,
      lead_id: leadId,
      value: lead.value || undefined,
      currency: "INR",
      notes: `Converted from lead #${leadId}`,
    };

    return this.createProject(zoneId, userId, createData);
  }
}
