import mysql from "mysql2/promise";
import { Pool, Connection } from "mysql2/promise";
import logger from "@utils/logger";

/**
 * Database Service
 * Manages MySQL connections, transactions, and migrations
 */
class DatabaseService {
  private pool: Pool | null = null;
  private initialized = false;

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    try {
      this.pool = await mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "crm_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelayMs: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.initialized = true;
      logger.info("Database initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows as T[];
    } catch (error) {
      logger.error("Database query error:", { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a single row query
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute an insert/update/delete query
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }

    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      logger.error("Database execute error:", { sql, params, error });
      throw error;
    }
  }

  /**
   * Run a transaction
   */
  async transaction<T>(
    callback: (connection: Connection) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error("Transaction failed:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get raw connection
   */
  async getConnection(): Promise<Connection> {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    return this.pool.getConnection();
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      logger.info("Database connection closed");
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default new DatabaseService();
