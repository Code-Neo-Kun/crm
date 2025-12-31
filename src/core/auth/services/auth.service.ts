import bcryptjs from "bcryptjs";
import database from "@services/database.service";
import jwtService from "./jwt.service";
import {
  User,
  UserWithZones,
  UserZone,
  AuthPayload,
  LoginResponse,
} from "@types/index";
import logger from "@utils/logger";

class AuthService {
  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(
      parseInt(process.env.BCRYPT_ROUNDS || "10")
    );
    return bcryptjs.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const sql = `
        SELECT id, username, email, first_name as firstName, last_name as lastName,
               phone, is_active as isActive, created_at as createdAt, updated_at as updatedAt
        FROM users
        WHERE username = ? AND is_active = TRUE
      `;
      return database.queryOne<User>(sql, [username]);
    } catch (error) {
      logger.error("Error fetching user by username:", error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    try {
      const sql = `
        SELECT id, username, email, first_name as firstName, last_name as lastName,
               phone, is_active as isActive, created_at as createdAt, updated_at as updatedAt
        FROM users
        WHERE id = ?
      `;
      return database.queryOne<User>(sql, [userId]);
    } catch (error) {
      logger.error("Error fetching user by ID:", error);
      return null;
    }
  }

  /**
   * Get user with zones and capabilities
   */
  async getUserWithZonesAndCapabilities(
    userId: number
  ): Promise<UserWithZones | null> {
    try {
      // Get user
      const user = await this.getUserById(userId);
      if (!user) return null;

      // Get zones
      const zones = await this.getUserZones(userId);
      if (zones.length === 0) return null;

      // Get capabilities
      const capabilities = await this.getUserCapabilities(userId);

      // Find primary zone
      const primaryZone = zones.find((z) => z.isPrimary);
      const primaryZoneId = primaryZone?.zoneId || zones[0]?.zoneId;

      return {
        ...user,
        zones,
        capabilities,
        primaryZoneId,
      };
    } catch (error) {
      logger.error("Error fetching user with zones:", error);
      return null;
    }
  }

  /**
   * Get user zones
   */
  async getUserZones(userId: number): Promise<UserZone[]> {
    try {
      const sql = `
        SELECT uz.id, uz.user_id as userId, uz.zone_id as zoneId, z.name as zoneName,
               uz.role, uz.is_primary as isPrimary, uz.assigned_at as assignedAt
        FROM user_zones uz
        JOIN zones z ON uz.zone_id = z.id
        WHERE uz.user_id = ?
        ORDER BY uz.is_primary DESC, uz.assigned_at ASC
      `;
      return database.query<UserZone>(sql, [userId]);
    } catch (error) {
      logger.error("Error fetching user zones:", error);
      return [];
    }
  }

  /**
   * Get user capabilities
   */
  async getUserCapabilities(userId: number): Promise<string[]> {
    try {
      const sql = `
        SELECT DISTINCT c.code
        FROM users u
        JOIN user_zones uz ON u.id = uz.user_id
        JOIN roles r ON uz.role = r.name
        JOIN role_capabilities rc ON r.id = rc.role_id
        JOIN capabilities c ON rc.capability_id = c.id
        WHERE u.id = ?
        UNION ALL
        SELECT code FROM capabilities WHERE code = 'core.user.read'
      `;
      const results = await database.query<{ code: string }>(sql, [userId]);
      return results.map((r) => r.code);
    } catch (error) {
      logger.error("Error fetching user capabilities:", error);
      return [];
    }
  }

  /**
   * Authenticate user (login)
   */
  async authenticate(
    username: string,
    password: string
  ): Promise<LoginResponse> {
    try {
      // Get user
      const user = await this.getUserByUsername(username);
      if (!user) {
        throw new Error("Invalid username or password");
      }

      // Get password hash
      const sql = "SELECT password_hash FROM users WHERE id = ?";
      const result = await database.queryOne<{ password_hash: string }>(sql, [
        user.id,
      ]);
      if (!result) {
        throw new Error("Invalid username or password");
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(
        password,
        result.password_hash
      );
      if (!isPasswordValid) {
        logger.warn(`Failed login attempt for user: ${username}`);
        throw new Error("Invalid username or password");
      }

      // Get user with zones and capabilities
      const userWithZones = await this.getUserWithZonesAndCapabilities(user.id);
      if (!userWithZones) {
        throw new Error("User configuration error");
      }

      // Create auth payload
      const payload: AuthPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        zones: userWithZones.zones,
        capabilities: userWithZones.capabilities,
        primaryZoneId: userWithZones.primaryZoneId || 0,
      };

      // Generate tokens
      const token = jwtService.generateToken(payload);
      const refreshToken = jwtService.generateRefreshToken(payload);

      logger.info(`User ${username} authenticated successfully`);

      return {
        user: userWithZones,
        token,
        refreshToken,
        expiresIn: 86400, // 24 hours in seconds
      };
    } catch (error) {
      logger.error("Authentication error:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = jwtService.verifyRefreshToken(refreshToken);
      return jwtService.generateToken(payload);
    } catch (error) {
      logger.error("Refresh token error:", error);
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * Validate user access to zone
   */
  async canAccessZone(userId: number, zoneId: number): Promise<boolean> {
    try {
      const sql = `
        SELECT COUNT(*) as count FROM user_zones
        WHERE user_id = ? AND zone_id = ?
      `;
      const result = await database.queryOne<{ count: number }>(sql, [
        userId,
        zoneId,
      ]);
      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error("Error checking zone access:", error);
      return false;
    }
  }

  /**
   * Get accessible zones for user
   */
  async getAccessibleZones(userId: number): Promise<number[]> {
    try {
      const zones = await this.getUserZones(userId);
      return zones.map((z) => z.zoneId);
    } catch (error) {
      logger.error("Error fetching accessible zones:", error);
      return [];
    }
  }
}

export default new AuthService();
