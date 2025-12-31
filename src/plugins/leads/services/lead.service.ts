import database from "@services/database.service";
import auditLogger from "@core/audit/services/audit.service";
import {
  Lead,
  LeadWithDetails,
  LeadActivity,
  CreateLeadRequest,
  UpdateLeadRequest,
  AssignLeadRequest,
  LEAD_STATUSES,
} from "../types";
import { PaginatedResponse, PaginationParams } from "@types/index";
import logger from "@utils/logger";

/**
 * Lead Service
 * Handles CRUD operations for leads with zone-based access
 */
class LeadService {
  /**
   * Create a new lead
   */
  async createLead(
    zoneId: number,
    userId: number,
    data: CreateLeadRequest
  ): Promise<Lead> {
    try {
      const sql = `
        INSERT INTO leads (
          zone_id, company_name, contact_name, email, phone,
          status, created_by_id, source, value, currency, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await database.execute(sql, [
        zoneId,
        data.companyName,
        data.contactName,
        data.email || null,
        data.phone || null,
        "new",
        userId,
        data.source || null,
        data.value || null,
        "INR",
        data.notes || null,
      ]);

      // Log creation
      await auditLogger.log({
        zoneId,
        userId,
        action: "create",
        entityType: "lead",
        entityId: result.insertId,
        newValues: data,
      });

      return this.getLeadById(result.insertId, zoneId);
    } catch (error) {
      logger.error("Error creating lead:", error);
      throw error;
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: number, zoneId: number): Promise<Lead> {
    try {
      const sql = `
        SELECT id, zone_id as zoneId, company_name as companyName,
               contact_name as contactName, email, phone, status,
               owner_id as ownerId, created_by_id as createdById,
               source, value, currency, notes,
               created_at as createdAt, updated_at as updatedAt
        FROM leads
        WHERE id = ? AND zone_id = ?
      `;

      const lead = await database.queryOne<Lead>(sql, [leadId, zoneId]);
      if (!lead) {
        throw new Error("Lead not found");
      }

      return lead;
    } catch (error) {
      logger.error("Error fetching lead:", error);
      throw error;
    }
  }

  /**
   * Get lead with full details (owner, activities)
   */
  async getLeadWithDetails(
    leadId: number,
    zoneId: number
  ): Promise<LeadWithDetails> {
    try {
      // Get lead
      const sql = `
        SELECT l.id, l.zone_id as zoneId, l.company_name as companyName,
               l.contact_name as contactName, l.email, l.phone, l.status,
               l.owner_id as ownerId, l.created_by_id as createdById,
               l.source, l.value, l.currency, l.notes,
               l.created_at as createdAt, l.updated_at as updatedAt,
               COALESCE(o.first_name, 'Unassigned') as ownerName,
               c.first_name as createdByName
        FROM leads l
        LEFT JOIN users o ON l.owner_id = o.id
        JOIN users c ON l.created_by_id = c.id
        WHERE l.id = ? AND l.zone_id = ?
      `;

      const lead = await database.queryOne<any>(sql, [leadId, zoneId]);
      if (!lead) {
        throw new Error("Lead not found");
      }

      // Get activities
      const activities = await this.getLeadActivities(leadId);

      return {
        ...lead,
        activities,
      };
    } catch (error) {
      logger.error("Error fetching lead with details:", error);
      throw error;
    }
  }

  /**
   * List leads with pagination and filtering
   */
  async listLeads(
    zoneId: number,
    filters: {
      status?: string;
      owner?: number;
      search?: string;
    } = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Lead>> {
    try {
      const page = pagination.page || 1;
      const pageSize = pagination.pageSize || 20;
      const offset = (page - 1) * pageSize;
      const sortBy = pagination.sortBy || "created_at";
      const sortOrder = pagination.sortOrder || "DESC";

      // Build where clause
      let whereClause = "WHERE l.zone_id = ?";
      const params: any[] = [zoneId];

      if (filters.status) {
        whereClause += " AND l.status = ?";
        params.push(filters.status);
      }

      if (filters.owner) {
        whereClause += " AND l.owner_id = ?";
        params.push(filters.owner);
      }

      if (filters.search) {
        whereClause += " AND (l.company_name LIKE ? OR l.contact_name LIKE ?)";
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Count query
      const countSql = `SELECT COUNT(*) as count FROM leads l ${whereClause}`;
      const countResult = await database.queryOne<{ count: number }>(
        countSql,
        params
      );
      const total = countResult?.count || 0;

      // Data query
      const dataSql = `
        SELECT l.id, l.zone_id as zoneId, l.company_name as companyName,
               l.contact_name as contactName, l.email, l.phone, l.status,
               l.owner_id as ownerId, l.created_by_id as createdById,
               l.source, l.value, l.currency, l.notes,
               l.created_at as createdAt, l.updated_at as updatedAt,
               COALESCE(o.first_name, 'Unassigned') as ownerName
        FROM leads l
        LEFT JOIN users o ON l.owner_id = o.id
        ${whereClause}
        ORDER BY l.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(pageSize, offset);
      const leads = await database.query<any>(dataSql, params);

      return {
        data: leads,
        meta: {
          total,
          page,
          pageSize,
          pages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error("Error listing leads:", error);
      throw error;
    }
  }

  /**
   * Update lead
   */
  async updateLead(
    leadId: number,
    zoneId: number,
    userId: number,
    data: UpdateLeadRequest
  ): Promise<Lead> {
    try {
      // Get old values
      const oldLead = await this.getLeadById(leadId, zoneId);

      // Validate status if provided
      if (data.status && !LEAD_STATUSES.includes(data.status as any)) {
        throw new Error("Invalid lead status");
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];

      if (data.companyName !== undefined) {
        updates.push("company_name = ?");
        values.push(data.companyName);
      }
      if (data.contactName !== undefined) {
        updates.push("contact_name = ?");
        values.push(data.contactName);
      }
      if (data.email !== undefined) {
        updates.push("email = ?");
        values.push(data.email || null);
      }
      if (data.phone !== undefined) {
        updates.push("phone = ?");
        values.push(data.phone || null);
      }
      if (data.status !== undefined) {
        updates.push("status = ?");
        values.push(data.status);
      }
      if (data.value !== undefined) {
        updates.push("value = ?");
        values.push(data.value || null);
      }
      if (data.notes !== undefined) {
        updates.push("notes = ?");
        values.push(data.notes || null);
      }

      if (updates.length === 0) {
        return oldLead;
      }

      updates.push("updated_at = NOW()");
      values.push(leadId, zoneId);

      const sql = `
        UPDATE leads
        SET ${updates.join(", ")}
        WHERE id = ? AND zone_id = ?
      `;

      await database.execute(sql, values);

      // Log update
      await auditLogger.log({
        zoneId,
        userId,
        action: "update",
        entityType: "lead",
        entityId: leadId,
        oldValues: oldLead,
        newValues: data,
      });

      return this.getLeadById(leadId, zoneId);
    } catch (error) {
      logger.error("Error updating lead:", error);
      throw error;
    }
  }

  /**
   * Assign lead to user (same zone only)
   */
  async assignLead(
    leadId: number,
    zoneId: number,
    userId: number,
    request: AssignLeadRequest
  ): Promise<Lead> {
    try {
      // Get old value
      const oldLead = await this.getLeadById(leadId, zoneId);

      // Update owner
      const sql = `
        UPDATE leads
        SET owner_id = ?, updated_at = NOW()
        WHERE id = ? AND zone_id = ?
      `;

      await database.execute(sql, [request.newOwnerId, leadId, zoneId]);

      // Log assignment
      await auditLogger.log({
        zoneId,
        userId,
        action: "assign",
        entityType: "lead",
        entityId: leadId,
        oldValues: { ownerId: oldLead.ownerId },
        newValues: { ownerId: request.newOwnerId },
      });

      // Add activity
      await this.addActivity(
        leadId,
        userId,
        "assignment",
        `Lead assigned to user ${request.newOwnerId}`
      );

      return this.getLeadById(leadId, zoneId);
    } catch (error) {
      logger.error("Error assigning lead:", error);
      throw error;
    }
  }

  /**
   * Get lead activities
   */
  async getLeadActivities(leadId: number): Promise<LeadActivity[]> {
    try {
      const sql = `
        SELECT la.id, la.lead_id as leadId, la.activity_type as type,
               la.description, la.performed_by_id as performedById,
               u.first_name as performedByName, la.created_at as createdAt
        FROM lead_activities la
        JOIN users u ON la.performed_by_id = u.id
        WHERE la.lead_id = ?
        ORDER BY la.created_at DESC
      `;

      return database.query<any>(sql, [leadId]);
    } catch (error) {
      logger.error("Error fetching lead activities:", error);
      return [];
    }
  }

  /**
   * Add activity to lead
   */
  async addActivity(
    leadId: number,
    userId: number,
    type: string,
    description: string
  ): Promise<LeadActivity> {
    try {
      const sql = `
        INSERT INTO lead_activities (
          lead_id, activity_type, description, performed_by_id, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;

      const result = await database.execute(sql, [
        leadId,
        type,
        description,
        userId,
      ]);

      // Return created activity
      const activitySql = `
        SELECT la.id, la.lead_id as leadId, la.activity_type as type,
               la.description, la.performed_by_id as performedById,
               u.first_name as performedByName, la.created_at as createdAt
        FROM lead_activities la
        JOIN users u ON la.performed_by_id = u.id
        WHERE la.id = ?
      `;

      const activity = await database.queryOne<LeadActivity>(activitySql, [
        result.insertId,
      ]);

      if (!activity) {
        throw new Error("Failed to create activity");
      }

      return activity;
    } catch (error) {
      logger.error("Error adding activity:", error);
      throw error;
    }
  }

  /**
   * Delete lead (soft delete via status)
   */
  async deleteLead(
    leadId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    try {
      // Get lead before deletion
      const lead = await this.getLeadById(leadId, zoneId);

      // Log deletion
      await auditLogger.log({
        zoneId,
        userId,
        action: "delete",
        entityType: "lead",
        entityId: leadId,
        oldValues: lead,
      });

      // Soft delete (mark as deleted status if needed, or hard delete)
      const sql = "DELETE FROM leads WHERE id = ? AND zone_id = ?";
      await database.execute(sql, [leadId, zoneId]);
    } catch (error) {
      logger.error("Error deleting lead:", error);
      throw error;
    }
  }

  /**
   * Get lead count by status (for reporting)
   */
  async getLeadCountByStatus(zoneId: number): Promise<Record<string, number>> {
    try {
      const sql = `
        SELECT status, COUNT(*) as count
        FROM leads
        WHERE zone_id = ?
        GROUP BY status
      `;

      const results = await database.query<{ status: string; count: number }>(
        sql,
        [zoneId]
      );

      const counts: Record<string, number> = {};
      for (const result of results) {
        counts[result.status] = result.count;
      }

      return counts;
    } catch (error) {
      logger.error("Error getting lead count by status:", error);
      return {};
    }
  }
}

export default new LeadService();
