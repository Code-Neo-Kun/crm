import database from "@services/database.service";
import { AuditEntry, AuditLog } from "@types/index";
import logger from "@utils/logger";

/**
 * Audit Logger Service
 * Logs all critical operations for compliance and debugging
 */
class AuditLogger {
  /**
   * Log an audit entry
   */
  async log(entry: AuditEntry): Promise<number | null> {
    try {
      const sql = `
        INSERT INTO audit_logs (
          zone_id, user_id, entity_type, entity_id, action,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        entry.zoneId,
        entry.userId,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
      ];

      const result = await database.execute(sql, params);
      return result.insertId;
    } catch (error) {
      logger.error("Audit logging error:", error);
      return null;
    }
  }

  /**
   * Log action denied (for security)
   */
  async logDenial(
    zoneId: number,
    userId: number,
    reason: string,
    entityType: string,
    entityId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const sql = `
        INSERT INTO audit_logs (
          zone_id, user_id, entity_type, entity_id, action,
          new_values, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, 'denied', ?, ?, ?, NOW())
      `;

      const params = [
        zoneId,
        userId,
        entityType,
        entityId,
        JSON.stringify({ reason }),
        ipAddress || null,
        userAgent || null,
      ];

      await database.execute(sql, params);
    } catch (error) {
      logger.error("Audit denial logging error:", error);
    }
  }

  /**
   * Get audit logs for entity
   */
  async getEntityLogs(
    entityType: string,
    entityId: number,
    limit = 50
  ): Promise<AuditLog[]> {
    try {
      const sql = `
        SELECT id, zone_id as zoneId, user_id as userId, entity_type as entityType,
               entity_id as entityId, action, old_values as oldValues,
               new_values as newValues, ip_address as ipAddress,
               user_agent as userAgent, created_at as createdAt
        FROM audit_logs
        WHERE entity_type = ? AND entity_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return database.query<AuditLog>(sql, [entityType, entityId, limit]);
    } catch (error) {
      logger.error("Error fetching audit logs:", error);
      return [];
    }
  }

  /**
   * Get user's recent actions
   */
  async getUserActions(userId: number, limit = 50): Promise<AuditLog[]> {
    try {
      const sql = `
        SELECT id, zone_id as zoneId, user_id as userId, entity_type as entityType,
               entity_id as entityId, action, old_values as oldValues,
               new_values as newValues, ip_address as ipAddress,
               user_agent as userAgent, created_at as createdAt
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return database.query<AuditLog>(sql, [userId, limit]);
    } catch (error) {
      logger.error("Error fetching user actions:", error);
      return [];
    }
  }

  /**
   * Get logs for zone (for zone admin)
   */
  async getZoneLogs(zoneId: number, limit = 100): Promise<AuditLog[]> {
    try {
      const sql = `
        SELECT id, zone_id as zoneId, user_id as userId, entity_type as entityType,
               entity_id as entityId, action, old_values as oldValues,
               new_values as newValues, ip_address as ipAddress,
               user_agent as userAgent, created_at as createdAt
        FROM audit_logs
        WHERE zone_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return database.query<AuditLog>(sql, [zoneId, limit]);
    } catch (error) {
      logger.error("Error fetching zone audit logs:", error);
      return [];
    }
  }

  /**
   * Get failed access attempts (security monitoring)
   */
  async getAccessDenials(
    fromDate: Date,
    toDate: Date,
    limit = 100
  ): Promise<AuditLog[]> {
    try {
      const sql = `
        SELECT id, zone_id as zoneId, user_id as userId, entity_type as entityType,
               entity_id as entityId, action, old_values as oldValues,
               new_values as newValues, ip_address as ipAddress,
               user_agent as userAgent, created_at as createdAt
        FROM audit_logs
        WHERE action = 'denied' AND created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
        LIMIT ?
      `;
      return database.query<AuditLog>(sql, [fromDate, toDate, limit]);
    } catch (error) {
      logger.error("Error fetching access denials:", error);
      return [];
    }
  }

  /**
   * Log user activity for implicit tracking
   */
  async logUserActivity(
    userId: number,
    zoneId: number,
    action: string,
    entityType: string,
    entityId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Async logging - don't wait for result
    this.log({
      userId,
      zoneId,
      action: action as any,
      entityType,
      entityId,
      ipAddress,
      userAgent,
    }).catch((err) => {
      logger.error("Failed to log user activity:", err);
    });
  }
}

export default new AuditLogger();
