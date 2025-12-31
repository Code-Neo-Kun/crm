/**
 * Pipeline Service
 * Manages pipeline creation, retrieval, stage management, and lifecycle
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import { PermissionValidator } from "@core/permissions/services/permission-validator";
import {
  Pipeline,
  PipelineWithStages,
  PipelineStage,
  CreatePipelineRequest,
  UpdatePipelineRequest,
  PIPELINE_VALIDATION_RULES,
  PIPELINE_TYPES,
} from "../types";

export class PipelineService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService,
    private permissionValidator: PermissionValidator
  ) {}

  /**
   * Create a new pipeline with stages
   * @param zoneId - Zone ID for multi-tenancy
   * @param userId - User creating the pipeline
   * @param data - Pipeline creation data
   * @throws Error if validation fails or database operation fails
   */
  async createPipeline(
    zoneId: number,
    userId: number,
    data: CreatePipelineRequest
  ): Promise<PipelineWithStages> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Pipeline name is required");
    }

    if (data.name.length > PIPELINE_VALIDATION_RULES.pipeline_name_max_length) {
      throw new Error(
        `Pipeline name must not exceed ${PIPELINE_VALIDATION_RULES.pipeline_name_max_length} characters`
      );
    }

    if (!Object.values(PIPELINE_TYPES).includes(data.type)) {
      throw new Error(`Invalid pipeline type: ${data.type}`);
    }

    if (
      !data.stages ||
      data.stages.length < PIPELINE_VALIDATION_RULES.min_stages
    ) {
      throw new Error(
        `Pipeline must have at least ${PIPELINE_VALIDATION_RULES.min_stages} stages`
      );
    }

    if (data.stages.length > PIPELINE_VALIDATION_RULES.max_stages) {
      throw new Error(
        `Pipeline cannot exceed ${PIPELINE_VALIDATION_RULES.max_stages} stages`
      );
    }

    // Check for duplicate pipeline names in zone
    const existingPipeline = await this.getPipelineByName(zoneId, data.name);
    if (existingPipeline && !PIPELINE_VALIDATION_RULES.allow_duplicate_names) {
      throw new Error(`Pipeline "${data.name}" already exists in this zone`);
    }

    // Check stage names are valid
    const stageNames = new Set<string>();
    for (const stage of data.stages) {
      if (!stage.stage_name || stage.stage_name.trim().length === 0) {
        throw new Error("All stages must have names");
      }

      if (
        stage.stage_name.length >
        PIPELINE_VALIDATION_RULES.stage_name_max_length
      ) {
        throw new Error(
          `Stage name must not exceed ${PIPELINE_VALIDATION_RULES.stage_name_max_length} characters`
        );
      }

      if (stageNames.has(stage.stage_name.toLowerCase())) {
        throw new Error(
          `Duplicate stage name within pipeline: "${stage.stage_name}"`
        );
      }

      stageNames.add(stage.stage_name.toLowerCase());
    }

    // Check at least one final stage exists
    const finalStages = data.stages.filter((s) => s.is_final);
    if (finalStages.length === 0) {
      throw new Error("Pipeline must have at least one final stage");
    }

    // Start transaction for atomicity
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      // Insert pipeline
      const pipelineSql = `
        INSERT INTO pipelines (zone_id, name, type, description, is_active, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const pipelineResult = await connection.execute(pipelineSql, [
        zoneId,
        data.name.trim(),
        data.type,
        data.description || null,
        true,
        userId,
      ]);

      const pipelineId = (pipelineResult[0] as any).insertId;

      // Insert stages
      const stageSql = `
        INSERT INTO pipeline_stages (pipeline_id, stage_name, sequence, is_final, description)
        VALUES (?, ?, ?, ?, ?)
      `;

      const stages: PipelineStage[] = [];

      // Sort stages by sequence before insert
      const sortedStages = [...data.stages].sort(
        (a, b) => a.sequence - b.sequence
      );

      for (const stage of sortedStages) {
        const stageResult = await connection.execute(stageSql, [
          pipelineId,
          stage.stage_name.trim(),
          stage.sequence,
          stage.is_final || false,
          stage.description || null,
        ]);

        stages.push({
          id: (stageResult[0] as any).insertId,
          pipeline_id: pipelineId,
          stage_name: stage.stage_name.trim(),
          sequence: stage.sequence,
          is_final: stage.is_final || false,
          description: stage.description || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        zoneId,
        userId,
        action: "create",
        entityType: "pipeline",
        entityId: pipelineId,
        oldValue: null,
        newValue: {
          name: data.name,
          type: data.type,
          stages: data.stages.length,
        },
      });

      return {
        id: pipelineId,
        zone_id: zoneId,
        name: data.name.trim(),
        type: data.type,
        description: data.description || null,
        is_active: true,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
        stages,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pipeline by ID with all stages
   * @param pipelineId - Pipeline ID
   * @param zoneId - Zone ID for access control
   */
  async getPipelineById(
    pipelineId: number,
    zoneId: number
  ): Promise<PipelineWithStages | null> {
    const sql = `
      SELECT id, zone_id, name, type, description, is_active, created_by, created_at, updated_at
      FROM pipelines
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [pipelineId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    const pipeline = (results[0] as any[])[0] as Pipeline;

    // Get stages
    const stages = await this.getPipelineStages(pipelineId);

    return {
      ...pipeline,
      stages,
    };
  }

  /**
   * Get pipeline by name within a zone
   */
  async getPipelineByName(
    zoneId: number,
    name: string
  ): Promise<Pipeline | null> {
    const sql = `
      SELECT id, zone_id, name, type, description, is_active, created_by, created_at, updated_at
      FROM pipelines
      WHERE zone_id = ? AND name = ?
    `;

    const results = await this.database.execute(sql, [zoneId, name]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as Pipeline;
  }

  /**
   * List all pipelines for a zone
   */
  async listPipelines(
    zoneId: number,
    filters?: {
      type?: PIPELINE_TYPES;
      is_active?: boolean;
    }
  ): Promise<PipelineWithStages[]> {
    let sql = `
      SELECT id, zone_id, name, type, description, is_active, created_by, created_at, updated_at
      FROM pipelines
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.type) {
      sql += " AND type = ?";
      params.push(filters.type);
    }

    if (filters?.is_active !== undefined) {
      sql += " AND is_active = ?";
      params.push(filters.is_active ? 1 : 0);
    }

    sql += " ORDER BY created_at DESC";

    const results = await this.database.execute(sql, params);
    const pipelines = results[0] as any[] as Pipeline[];

    // Get stages for each pipeline
    const pipelinesWithStages: PipelineWithStages[] = [];
    for (const pipeline of pipelines) {
      const stages = await this.getPipelineStages(pipeline.id);
      pipelinesWithStages.push({
        ...pipeline,
        stages,
      });
    }

    return pipelinesWithStages;
  }

  /**
   * Get all stages for a pipeline, ordered by sequence
   */
  async getPipelineStages(pipelineId: number): Promise<PipelineStage[]> {
    const sql = `
      SELECT id, pipeline_id, stage_name, sequence, is_final, description, created_at, updated_at
      FROM pipeline_stages
      WHERE pipeline_id = ?
      ORDER BY sequence ASC
    `;

    const results = await this.database.execute(sql, [pipelineId]);
    return results[0] as any[] as PipelineStage[];
  }

  /**
   * Get a specific stage by ID
   */
  async getStageById(
    stageId: number,
    pipelineId: number
  ): Promise<PipelineStage | null> {
    const sql = `
      SELECT id, pipeline_id, stage_name, sequence, is_final, description, created_at, updated_at
      FROM pipeline_stages
      WHERE id = ? AND pipeline_id = ?
    `;

    const results = await this.database.execute(sql, [stageId, pipelineId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as PipelineStage;
  }

  /**
   * Update pipeline metadata
   */
  async updatePipeline(
    pipelineId: number,
    zoneId: number,
    userId: number,
    data: UpdatePipelineRequest
  ): Promise<Pipeline> {
    // Get existing pipeline
    const existing = await this.getPipelineById(pipelineId, zoneId);
    if (!existing) {
      throw new Error("Pipeline not found");
    }

    // Check if name is being changed to duplicate
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.getPipelineByName(zoneId, data.name);
      if (duplicate && !PIPELINE_VALIDATION_RULES.allow_duplicate_names) {
        throw new Error(`Pipeline "${data.name}" already exists in this zone`);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      if (
        data.name.length > PIPELINE_VALIDATION_RULES.pipeline_name_max_length
      ) {
        throw new Error(
          `Pipeline name must not exceed ${PIPELINE_VALIDATION_RULES.pipeline_name_max_length} characters`
        );
      }
      updates.push("name = ?");
      values.push(data.name.trim());
    }

    if (data.type !== undefined) {
      if (!Object.values(PIPELINE_TYPES).includes(data.type)) {
        throw new Error(`Invalid pipeline type: ${data.type}`);
      }
      updates.push("type = ?");
      values.push(data.type);
    }

    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description || null);
    }

    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = NOW()");
    values.push(pipelineId, zoneId);

    const sql = `UPDATE pipelines SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "pipeline",
      entityId: pipelineId,
      oldValue: {
        name: existing.name,
        type: existing.type,
        description: existing.description,
        is_active: existing.is_active,
      },
      newValue: data,
    });

    const updated = await this.getPipelineById(pipelineId, zoneId);
    if (!updated) {
      throw new Error("Failed to retrieve updated pipeline");
    }

    return updated;
  }

  /**
   * Delete pipeline (soft delete by marking inactive)
   */
  async deletePipeline(
    pipelineId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const sql = `
      UPDATE pipelines
      SET is_active = 0, updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [pipelineId, zoneId]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "delete",
      entityType: "pipeline",
      entityId: pipelineId,
      oldValue: { id: pipelineId },
      newValue: null,
    });
  }

  /**
   * Add a new stage to existing pipeline
   */
  async addStage(
    pipelineId: number,
    zoneId: number,
    userId: number,
    stageName: string,
    sequence: number,
    isFinal: boolean = false,
    description?: string
  ): Promise<PipelineStage> {
    // Verify pipeline exists and belongs to zone
    const pipeline = await this.getPipelineById(pipelineId, zoneId);
    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    // Validate stage name
    if (!stageName || stageName.trim().length === 0) {
      throw new Error("Stage name is required");
    }

    if (stageName.length > PIPELINE_VALIDATION_RULES.stage_name_max_length) {
      throw new Error(
        `Stage name must not exceed ${PIPELINE_VALIDATION_RULES.stage_name_max_length} characters`
      );
    }

    // Check duplicate stage name in this pipeline
    const existingStages = pipeline.stages || [];
    const duplicateStage = existingStages.find(
      (s) => s.stage_name.toLowerCase() === stageName.toLowerCase()
    );
    if (duplicateStage) {
      throw new Error(`Stage "${stageName}" already exists in this pipeline`);
    }

    // Check if adding final stage when one exists
    if (isFinal && existingStages.some((s) => s.is_final)) {
      // Allow multiple final stages for flexibility
    }

    const sql = `
      INSERT INTO pipeline_stages (pipeline_id, stage_name, sequence, is_final, description)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      pipelineId,
      stageName.trim(),
      sequence,
      isFinal ? 1 : 0,
      description || null,
    ]);

    const stageId = (result[0] as any).insertId;

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "create",
      entityType: "pipeline_stage",
      entityId: stageId,
      oldValue: null,
      newValue: {
        pipeline_id: pipelineId,
        stage_name: stageName,
        sequence,
        is_final: isFinal,
      },
    });

    return {
      id: stageId,
      pipeline_id: pipelineId,
      stage_name: stageName.trim(),
      sequence,
      is_final: isFinal,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Update a stage
   */
  async updateStage(
    stageId: number,
    pipelineId: number,
    zoneId: number,
    userId: number,
    updates: {
      stage_name?: string;
      sequence?: number;
      is_final?: boolean;
      description?: string;
    }
  ): Promise<PipelineStage> {
    // Verify pipeline exists
    const pipeline = await this.getPipelineById(pipelineId, zoneId);
    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    // Get current stage
    const stage = await this.getStageById(stageId, pipelineId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.stage_name !== undefined) {
      if (
        updates.stage_name.length >
        PIPELINE_VALIDATION_RULES.stage_name_max_length
      ) {
        throw new Error(
          `Stage name must not exceed ${PIPELINE_VALIDATION_RULES.stage_name_max_length} characters`
        );
      }

      // Check for duplicates in this pipeline
      const existingStages = pipeline.stages || [];
      const duplicate = existingStages.find(
        (s) =>
          s.id !== stageId &&
          s.stage_name.toLowerCase() === updates.stage_name!.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Stage "${updates.stage_name}" already exists`);
      }

      updateFields.push("stage_name = ?");
      values.push(updates.stage_name.trim());
    }

    if (updates.sequence !== undefined) {
      updateFields.push("sequence = ?");
      values.push(updates.sequence);
    }

    if (updates.is_final !== undefined) {
      updateFields.push("is_final = ?");
      values.push(updates.is_final ? 1 : 0);
    }

    if (updates.description !== undefined) {
      updateFields.push("description = ?");
      values.push(updates.description || null);
    }

    if (updateFields.length === 0) {
      return stage;
    }

    updateFields.push("updated_at = NOW()");
    values.push(stageId, pipelineId);

    const sql = `
      UPDATE pipeline_stages
      SET ${updateFields.join(", ")}
      WHERE id = ? AND pipeline_id = ?
    `;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "pipeline_stage",
      entityId: stageId,
      oldValue: stage,
      newValue: updates,
    });

    const updated = await this.getStageById(stageId, pipelineId);
    if (!updated) {
      throw new Error("Failed to retrieve updated stage");
    }

    return updated;
  }
}
