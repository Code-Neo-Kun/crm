import "dotenv/config";
import app from "./app";
import database from "@services/database.service";
import logger from "@utils/logger";

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "localhost";

/**
 * Start server
 */
async function startServer() {
  try {
    logger.info("🚀 Starting Zone-Based CRM Server...");

    // Initialize database
    logger.info("📦 Initializing database...");
    await database.initialize();

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`✅ Server running at http://${HOST}:${PORT}`);
      logger.info(`📡 API available at http://${HOST}:${PORT}/api/v1`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("⏹️  SIGTERM received, shutting down gracefully...");
      server.close(async () => {
        await database.close();
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("⏹️  SIGINT received, shutting down gracefully...");
      server.close(async () => {
        await database.close();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
