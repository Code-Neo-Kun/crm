import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import logger from "@utils/logger";
import { authenticate, requireAuth } from "@core/auth/middleware/authenticate";
import authController from "@core/auth/controllers/auth.controller";
import leadRoutes from "@plugins/leads/routes";
import projectRoutes from "@plugins/projects/routes";
import taskRoutes from "@plugins/tasks/routes";
import pricingRoutes from "@plugins/pricing/routes";

// Initialize Express app
const app: Express = express();

// ============================================================================
// Middleware
// ============================================================================

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request ID
app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
  req.id = (req.headers["x-request-id"] as string) || uuidv4();
  next();
});

// Request logging
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

// API version check
app.get("/api/v1", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      version: "1.0.0",
      name: "Zone-Based CRM API",
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// Auth Routes
// ============================================================================

app.post("/api/v1/auth/login", (req: Request, res: Response) => {
  authController.login(req, res);
});

app.post("/api/v1/auth/logout", authenticate, (req: Request, res: Response) => {
  authController.logout(req, res);
});

app.post("/api/v1/auth/refresh", (req: Request, res: Response) => {
  authController.refresh(req, res);
});

app.get("/api/v1/auth/me", authenticate, (req: Request, res: Response) => {
  authController.me(req, res);
});

// ============================================================================
// Lead Routes
// ============================================================================

app.use("/api/v1/leads", leadRoutes);

// ============================================================================
// Project & Pipeline Routes
// ============================================================================

app.use("/api/v1", projectRoutes);

// ============================================================================
// Task & Meeting Routes
// ============================================================================

app.use("/api/v1", taskRoutes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 Handler
app.use((req: Request & { id?: string }, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
      statusCode: 404,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "unknown",
    },
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: Request & { id?: string },
    res: Response,
    next: NextFunction
  ) => {
    logger.error("Unhandled error:", err);

    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || "INTERNAL_ERROR",
        message: err.message || "An unexpected error occurred",
        statusCode: err.statusCode || 500,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id || "unknown",
      },
    });
  }
);

export default app;
