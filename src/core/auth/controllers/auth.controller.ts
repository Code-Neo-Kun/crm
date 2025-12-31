import { Request, Response } from "express";
import authService from "../services/auth.service";
import jwtService from "../services/jwt.service";
import { LoginRequest } from "@types/index";
import logger from "@utils/logger";

class AuthController {
  /**
   * POST /auth/login
   * Login with username and password
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body as LoginRequest;

      // Validate input
      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Username and password are required",
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Authenticate
      const result = await authService.authenticate(username, password);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Login error:", error);

      const statusCode = error.message.includes("Invalid") ? 401 : 500;
      const code =
        statusCode === 401 ? "INVALID_CREDENTIALS" : "INTERNAL_ERROR";

      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error.message || "Login failed",
          statusCode,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * POST /auth/logout
   * Invalidate session (currently stateless, but log the action)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.context) {
        logger.info(`User ${req.context.username} logged out`);
      }

      res.status(200).json({
        success: true,
        data: {
          message: "Logged out successfully",
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Logout failed",
          statusCode: 500,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Refresh token is required",
            statusCode: 400,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      const newToken = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error: any) {
      logger.error("Refresh token error:", error);

      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: error.message || "Token refresh failed",
          statusCode: 401,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
            statusCode: 401,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      // Get fresh user data
      const user = await authService.getUserWithZonesAndCapabilities(
        req.context.userId
      );

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
            statusCode: 404,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || "unknown",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    } catch (error) {
      logger.error("Get current user error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch user info",
          statusCode: 500,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
    }
  }
}

export default new AuthController();
