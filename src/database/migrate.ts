import "dotenv/config";
import database from "@services/database.service";
import fs from "fs";
import path from "path";
import logger from "@utils/logger";

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    logger.info("🔄 Running database migrations...");

    // Initialize database
    await database.initialize();

    // Read schema file
    const schemaPath = path.join(
      __dirname,
      "..",
      "..",
      "database",
      "schema.sql"
    );
    const schema = fs.readFileSync(schemaPath, "utf-8");

    // Split statements (basic split by semicolon)
    const statements = schema
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    // Execute each statement
    let count = 0;
    for (const statement of statements) {
      try {
        await database.execute(statement);
        count++;
      } catch (error: any) {
        // Some statements may fail if tables already exist, which is okay
        if (
          error.code &&
          (error.code === "ER_TABLE_EXISTS_ERROR" ||
            error.code === "ER_DUP_FIELDNAME")
        ) {
          logger.debug(
            `Skipping statement (already exists): ${statement.substring(
              0,
              50
            )}...`
          );
        } else {
          logger.error(
            `Failed to execute statement: ${statement.substring(0, 100)}...`,
            error
          );
          throw error;
        }
      }
    }

    logger.info(`✅ ${count} migrations completed successfully`);

    // Verify core tables exist
    const tables = [
      "zones",
      "users",
      "user_zones",
      "roles",
      "capabilities",
      "role_capabilities",
      "audit_logs",
    ];

    for (const table of tables) {
      const sql = `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`;
      const result = await database.queryOne<{ "1": number }>(sql, [
        process.env.DB_NAME || "crm_db",
        table,
      ]);

      if (!result) {
        throw new Error(`Required table "${table}" was not created`);
      }
    }

    logger.info("✅ All required tables verified");

    // Close connection
    await database.close();
    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
