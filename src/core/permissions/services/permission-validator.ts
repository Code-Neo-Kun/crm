import database from "@services/database.service";
import authService from "@core/auth/services/auth.service";
import { PermissionContext, PermissionCheck } from "@types/index";
import logger from "@utils/logger";

/**
 * Permission Validator Service
 * Core authorization logic for zone-based access control
 */
class PermissionValidator {
  /**
   * Check if user has capability
   */
  async hasCapability(userId: number, capability: string): Promise<boolean> {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM users u
        JOIN user_zones uz ON u.id = uz.user_id
        JOIN roles r ON uz.role = r.name
        JOIN role_capabilities rc ON r.id = rc.role_id
        JOIN capabilities c ON rc.capability_id = c.id
        WHERE u.id = ? AND c.code = ?
      `;
      const result = await database.queryOne<{ count: number }>(sql, [
        userId,
        capability,
      ]);
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error("Error checking capability:", error);
      return false;
    }
  }

  /**
   * Check if user has capability in specific zone
   */
  async hasCapabilityInZone(
    userId: number,
    capability: string,
    zoneId: number
  ): Promise<boolean> {
    try {
      // Check capability
      const hasCapability = await this.hasCapability(userId, capability);
      if (!hasCapability) return false;

      // Check zone access
      return authService.canAccessZone(userId, zoneId);
    } catch (error) {
      logger.error("Error checking capability in zone:", error);
      return false;
    }
  }

  /**
   * Validate user can access entity in zone
   */
  async canAccessEntity(
    userId: number,
    entityZoneId: number
  ): Promise<PermissionCheck> {
    try {
      // Get user zones
      const zones = await authService.getAccessibleZones(userId);

      if (!zones.includes(entityZoneId)) {
        return {
          allowed: false,
          reason: "Cross-zone access denied",
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error("Error checking entity access:", error);
      return {
        allowed: false,
        reason: "Permission check failed",
      };
    }
  }

  /**
   * Validate user can assign to another user (same zone check)
   */
  async canAssignToUser(
    assignerUserId: number,
    targetUserId: number,
    targetZoneId: number
  ): Promise<PermissionCheck> {
    try {
      // Check if assigner has assign capability in this zone
      const hasCapability = await this.hasCapabilityInZone(
        assignerUserId,
        "lead.assign",
        targetZoneId
      );

      if (!hasCapability) {
        return {
          allowed: false,
          reason: "Insufficient permissions to assign",
        };
      }

      // Check if target user is in the same zone
      const targetCanAccess = await authService.canAccessZone(
        targetUserId,
        targetZoneId
      );

      if (!targetCanAccess) {
        return {
          allowed: false,
          reason: "Target user is not in the same zone",
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error("Error checking assignment permission:", error);
      return {
        allowed: false,
        reason: "Permission check failed",
      };
    }
  }

  /**
   * Validate user can perform action on entity
   */
  async canPerformAction(
    userId: number,
    action: string,
    entityType: string,
    entityZoneId: number,
    additionalChecks?: (userId: number) => Promise<boolean>
  ): Promise<PermissionCheck> {
    try {
      // Check zone access first
      const zoneCheck = await this.canAccessEntity(userId, entityZoneId);
      if (!zoneCheck.allowed) {
        return zoneCheck;
      }

      // Map action to capability
      const capability = `${entityType}.${action}`;

      // Check capability
      const hasCapability = await this.hasCapability(userId, capability);
      if (!hasCapability) {
        return {
          allowed: false,
          reason: `Missing capability: ${capability}`,
        };
      }

      // Run additional checks if provided
      if (additionalChecks) {
        const additionalChecksPassed = await additionalChecks(userId);
        if (!additionalChecksPassed) {
          return {
            allowed: false,
            reason: "Additional permission checks failed",
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error("Error checking action permission:", error);
      return {
        allowed: false,
        reason: "Permission check failed",
      };
    }
  }

  /**
   * Get user role in zone
   */
  async getUserRoleInZone(
    userId: number,
    zoneId: number
  ): Promise<string | null> {
    try {
      const sql = `
        SELECT uz.role
        FROM user_zones uz
        WHERE uz.user_id = ? AND uz.zone_id = ?
      `;
      const result = await database.queryOne<{ role: string }>(sql, [
        userId,
        zoneId,
      ]);
      return result?.role || null;
    } catch (error) {
      logger.error("Error fetching user role in zone:", error);
      return null;
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId: number): Promise<boolean> {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM user_zones uz
        JOIN roles r ON uz.role = r.name
        WHERE uz.user_id = ? AND r.name = 'super_admin'
      `;
      const result = await database.queryOne<{ count: number }>(sql, [userId]);
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error("Error checking super admin status:", error);
      return false;
    }
  }

  /**
   * Check if user is zone admin in specific zone
   */
  async isZoneAdmin(userId: number, zoneId: number): Promise<boolean> {
    try {
      const role = await this.getUserRoleInZone(userId, zoneId);
      return role === "zone_admin";
    } catch (error) {
      logger.error("Error checking zone admin status:", error);
      return false;
    }
  }

  /**
   * Get user context for permission checks
   */
  async getPermissionContext(
    userId: number
  ): Promise<PermissionContext | null> {
    try {
      const user = await authService.getUserWithZonesAndCapabilities(userId);
      if (!user) return null;

      const accessibleZones = await authService.getAccessibleZones(userId);

      return {
        userId: user.id,
        role: user.zones[0]?.role || "viewer",
        accessibleZones,
        capabilities: user.capabilities,
        primaryZoneId: user.primaryZoneId || 0,
      };
    } catch (error) {
      logger.error("Error creating permission context:", error);
      return null;
    }
  }
}

export default new PermissionValidator();
