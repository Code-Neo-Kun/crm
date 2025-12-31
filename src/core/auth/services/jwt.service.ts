import jwt from "jsonwebtoken";
import { AuthPayload } from "@types/index";
import logger from "@utils/logger";

class JwtService {
  private secret = process.env.JWT_SECRET || "change-me-in-production";
  private expiry = process.env.JWT_EXPIRY || "24h";
  private refreshExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";

  /**
   * Generate JWT token
   */
  generateToken(payload: AuthPayload): string {
    try {
      return jwt.sign(payload, this.secret, {
        expiresIn: this.expiry,
      });
    } catch (error) {
      logger.error("Failed to generate JWT token", error);
      throw error;
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: AuthPayload): string {
    try {
      return jwt.sign(payload, this.secret + "refresh", {
        expiresIn: this.refreshExpiry,
      });
    } catch (error) {
      logger.error("Failed to generate refresh token", error);
      throw error;
    }
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.secret) as AuthPayload;
    } catch (error) {
      logger.warn("Token verification failed:", error);
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.secret + "refresh") as AuthPayload;
    } catch (error) {
      logger.warn("Refresh token verification failed:", error);
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): AuthPayload | null {
    try {
      return jwt.decode(token) as AuthPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

export default new JwtService();
