import { Request, Response, NextFunction } from "express";
import jwtService from "../services/jwt.service";
import { RequestContext } from "@types/index";
import logger from "@utils/logger";

/**
 * Extend Express Request with context
 */
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user context to request
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization token",
          statusCode: 401,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = jwtService.verifyToken(token);

    // Attach context to request
    req.context = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      zones: payload.zones,
      capabilities: payload.capabilities,
      primaryZoneId: payload.primaryZoneId,
      role: payload.zones[0]?.role || "viewer",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    };

    next();
  } catch (error) {
    logger.warn("Authentication failed:", error);
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token",
        statusCode: 401,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || "unknown",
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Does not fail if token is missing, but verifies if present
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyToken(token);

      req.context = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        zones: payload.zones,
        capabilities: payload.capabilities,
        primaryZoneId: payload.primaryZoneId,
        role: payload.zones[0]?.role || "viewer",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
    }
  } catch (error) {
    logger.debug(
      "Optional auth token verification failed, continuing as guest"
    );
  }

  next();
};

/**
 * Require authentication
 * Use this as a route middleware
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.context) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
        statusCode: 401,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || "unknown",
      },
    });
    return;
  }

  next();
};

/**
 * Require specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.context) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          statusCode: 401,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.context.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: `This action requires one of these roles: ${allowedRoles.join(
            ", "
          )}`,
          statusCode: 403,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id || "unknown",
        },
      });
      return;
    }

    next();
  };
};
