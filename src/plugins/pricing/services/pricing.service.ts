/**
 * Pricing Service
 * Manages price lists, pricing items, and pricing audit trails
 */

import { DatabaseService } from "@services/database.service";
import { AuditService } from "@core/audit/services/audit.service";
import {
  PriceList,
  PriceListWithItems,
  PriceListItem,
  PricingAuditEntry,
  CreatePriceListRequest,
  UpdatePriceListRequest,
  UpdatePriceListItemRequest,
  AddPriceListItemRequest,
  PRICING_TIER_TYPES,
  PRICING_VALIDATION_RULES,
} from "../types";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface PricingFilters {
  is_active?: boolean;
  search?: string;
}

interface ListPriceListsResult {
  priceLists: PriceListWithItems[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class PricingService {
  constructor(
    private database: DatabaseService,
    private auditLogger: AuditService
  ) {}

  /**
   * Create a new price list with items
   */
  async createPriceList(
    zoneId: number,
    userId: number,
    data: CreatePriceListRequest
  ): Promise<PriceListWithItems> {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Price list name is required");
    }

    if (data.name.length > PRICING_VALIDATION_RULES.name_max_length) {
      throw new Error(
        `Price list name must not exceed ${PRICING_VALIDATION_RULES.name_max_length} characters`
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new Error("At least one price list item is required");
    }

    // Validate items
    for (const item of data.items) {
      if (!item.item_name || item.item_name.trim().length === 0) {
        throw new Error("All items must have a name");
      }

      if (
        item.item_name.length > PRICING_VALIDATION_RULES.item_name_max_length
      ) {
        throw new Error(
          `Item name must not exceed ${PRICING_VALIDATION_RULES.item_name_max_length} characters`
        );
      }

      if (!item.item_code || item.item_code.trim().length === 0) {
        throw new Error("All items must have a code");
      }

      if (
        item.item_code.length > PRICING_VALIDATION_RULES.item_code_max_length
      ) {
        throw new Error(
          `Item code must not exceed ${PRICING_VALIDATION_RULES.item_code_max_length} characters`
        );
      }

      if (!Object.values(PRICING_TIER_TYPES).includes(item.tier)) {
        throw new Error(`Invalid pricing tier: ${item.tier}`);
      }

      if (
        item.unit_price < PRICING_VALIDATION_RULES.min_unit_price ||
        item.unit_price > PRICING_VALIDATION_RULES.max_unit_price
      ) {
        throw new Error(
          `Unit price must be between ${PRICING_VALIDATION_RULES.min_unit_price} and ${PRICING_VALIDATION_RULES.max_unit_price}`
        );
      }

      const discount = item.discount_percentage || 0;
      if (
        discount < PRICING_VALIDATION_RULES.min_discount ||
        discount > PRICING_VALIDATION_RULES.max_discount
      ) {
        throw new Error(
          `Discount percentage must be between ${PRICING_VALIDATION_RULES.min_discount} and ${PRICING_VALIDATION_RULES.max_discount}`
        );
      }
    }

    // Start transaction
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      // Create price list
      const priceListSql = `
        INSERT INTO price_lists (zone_id, name, description, currency, is_active, version, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const priceListResult = await connection.execute(priceListSql, [
        zoneId,
        data.name.trim(),
        data.description || null,
        data.currency || "INR",
        true,
        1,
        userId,
      ]);

      const priceListId = (priceListResult[0] as any).insertId;

      // Create items
      const itemSql = `
        INSERT INTO price_list_items (
          price_list_id, item_name, item_code, tier, unit_price,
          quantity_breakpoint, discount_percentage, description, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const items: PriceListItem[] = [];

      for (const item of data.items) {
        const itemResult = await connection.execute(itemSql, [
          priceListId,
          item.item_name.trim(),
          item.item_code.trim().toUpperCase(),
          item.tier,
          item.unit_price,
          item.quantity_breakpoint || null,
          item.discount_percentage || 0,
          item.description || null,
          true,
        ]);

        items.push({
          id: (itemResult[0] as any).insertId,
          price_list_id: priceListId,
          item_name: item.item_name.trim(),
          item_code: item.item_code.trim().toUpperCase(),
          tier: item.tier,
          unit_price: item.unit_price,
          quantity_breakpoint: item.quantity_breakpoint || null,
          discount_percentage: item.discount_percentage || 0,
          description: item.description || null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      await connection.commit();

      // Audit log
      await this.auditLogger.log({
        zoneId,
        userId,
        action: "create",
        entityType: "price_list",
        entityId: priceListId,
        oldValue: null,
        newValue: {
          name: data.name,
          items: data.items.length,
          currency: data.currency || "INR",
        },
      });

      return {
        id: priceListId,
        zone_id: zoneId,
        name: data.name.trim(),
        description: data.description || null,
        currency: data.currency || "INR",
        is_active: true,
        version: 1,
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
        items,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get price list by ID
   */
  async getPriceListById(
    priceListId: number,
    zoneId: number
  ): Promise<PriceList | null> {
    const sql = `
      SELECT id, zone_id, name, description, currency, is_active, version,
             created_by, created_at, updated_at
      FROM price_lists
      WHERE id = ? AND zone_id = ?
    `;

    const results = await this.database.execute(sql, [priceListId, zoneId]);

    if ((results[0] as any[]).length === 0) {
      return null;
    }

    return (results[0] as any[])[0] as PriceList;
  }

  /**
   * Get price list with items
   */
  async getPriceListWithItems(
    priceListId: number,
    zoneId: number
  ): Promise<PriceListWithItems> {
    const priceList = await this.getPriceListById(priceListId, zoneId);
    if (!priceList) {
      throw new Error("Price list not found");
    }

    const itemsSql = `
      SELECT id, price_list_id, item_name, item_code, tier, unit_price,
             quantity_breakpoint, discount_percentage, description, is_active,
             created_at, updated_at
      FROM price_list_items
      WHERE price_list_id = ?
      ORDER BY tier ASC, item_code ASC
    `;

    const itemsResults = await this.database.execute(itemsSql, [priceListId]);
    const items = itemsResults[0] as any[] as PriceListItem[];

    return {
      ...priceList,
      items,
    };
  }

  /**
   * List price lists for zone
   */
  async listPriceLists(
    zoneId: number,
    filters?: PricingFilters,
    pagination?: PaginationParams
  ): Promise<ListPriceListsResult> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = `
      SELECT id, zone_id, name, description, currency, is_active, version,
             created_by, created_at, updated_at
      FROM price_lists
      WHERE zone_id = ?
    `;

    const params: any[] = [zoneId];

    if (filters?.is_active !== undefined) {
      sql += " AND is_active = ?";
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters?.search) {
      sql += " AND (name LIKE ? OR description LIKE ?)";
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT.*?FROM/,
      "SELECT COUNT(*) as count FROM"
    );
    const countResult = await this.database.execute(countSql, params);
    const total = (countResult[0] as any[])[0].count;

    // Get paginated results
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    const results = await this.database.execute(sql, params);
    const priceLists = results[0] as any[] as PriceList[];

    // Hydrate with items
    const priceListsWithItems: PriceListWithItems[] = [];
    for (const priceList of priceLists) {
      const priceListWithItems = await this.getPriceListWithItems(
        priceList.id,
        zoneId
      );
      priceListsWithItems.push(priceListWithItems);
    }

    return {
      priceLists: priceListsWithItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update price list metadata
   */
  async updatePriceList(
    priceListId: number,
    zoneId: number,
    userId: number,
    data: UpdatePriceListRequest
  ): Promise<PriceListWithItems> {
    const existing = await this.getPriceListById(priceListId, zoneId);
    if (!existing) {
      throw new Error("Price list not found");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("Price list name cannot be empty");
      }
      if (data.name.length > PRICING_VALIDATION_RULES.name_max_length) {
        throw new Error(
          `Price list name must not exceed ${PRICING_VALIDATION_RULES.name_max_length} characters`
        );
      }
      updates.push("name = ?");
      values.push(data.name.trim());
    }

    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description || null);
    }

    if (data.currency !== undefined) {
      updates.push("currency = ?");
      values.push(data.currency);
    }

    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getPriceListWithItems(priceListId, zoneId);
    }

    updates.push("version = version + 1", "updated_at = NOW()");
    values.push(priceListId, zoneId);

    const sql = `UPDATE price_lists SET ${updates.join(
      ", "
    )} WHERE id = ? AND zone_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "price_list",
      entityId: priceListId,
      oldValue: existing,
      newValue: data,
    });

    return this.getPriceListWithItems(priceListId, zoneId);
  }

  /**
   * Add item to price list
   */
  async addItem(
    priceListId: number,
    zoneId: number,
    userId: number,
    data: AddPriceListItemRequest
  ): Promise<PriceListItem> {
    const priceList = await this.getPriceListById(priceListId, zoneId);
    if (!priceList) {
      throw new Error("Price list not found");
    }

    // Validation
    if (!data.item_name || data.item_name.trim().length === 0) {
      throw new Error("Item name is required");
    }

    if (data.item_name.length > PRICING_VALIDATION_RULES.item_name_max_length) {
      throw new Error(
        `Item name must not exceed ${PRICING_VALIDATION_RULES.item_name_max_length} characters`
      );
    }

    if (!data.item_code || data.item_code.trim().length === 0) {
      throw new Error("Item code is required");
    }

    if (data.item_code.length > PRICING_VALIDATION_RULES.item_code_max_length) {
      throw new Error(
        `Item code must not exceed ${PRICING_VALIDATION_RULES.item_code_max_length} characters`
      );
    }

    if (!Object.values(PRICING_TIER_TYPES).includes(data.tier)) {
      throw new Error(`Invalid pricing tier: ${data.tier}`);
    }

    if (
      data.unit_price < PRICING_VALIDATION_RULES.min_unit_price ||
      data.unit_price > PRICING_VALIDATION_RULES.max_unit_price
    ) {
      throw new Error(
        `Unit price must be between ${PRICING_VALIDATION_RULES.min_unit_price} and ${PRICING_VALIDATION_RULES.max_unit_price}`
      );
    }

    const discount = data.discount_percentage || 0;
    if (
      discount < PRICING_VALIDATION_RULES.min_discount ||
      discount > PRICING_VALIDATION_RULES.max_discount
    ) {
      throw new Error(
        `Discount percentage must be between ${PRICING_VALIDATION_RULES.min_discount} and ${PRICING_VALIDATION_RULES.max_discount}`
      );
    }

    // Check for duplicate item code
    const duplicateCheck = await this.database.execute(
      "SELECT id FROM price_list_items WHERE price_list_id = ? AND item_code = ?",
      [priceListId, data.item_code.trim().toUpperCase()]
    );

    if ((duplicateCheck[0] as any[]).length > 0) {
      throw new Error(
        `Item code "${data.item_code}" already exists in this price list`
      );
    }

    const sql = `
      INSERT INTO price_list_items (
        price_list_id, item_name, item_code, tier, unit_price,
        quantity_breakpoint, discount_percentage, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.database.execute(sql, [
      priceListId,
      data.item_name.trim(),
      data.item_code.trim().toUpperCase(),
      data.tier,
      data.unit_price,
      data.quantity_breakpoint || null,
      data.discount_percentage || 0,
      data.description || null,
      true,
    ]);

    const itemId = (result[0] as any).insertId;

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "create",
      entityType: "price_list_item",
      entityId: itemId,
      oldValue: null,
      newValue: {
        item_name: data.item_name,
        item_code: data.item_code,
        unit_price: data.unit_price,
      },
    });

    return {
      id: itemId,
      price_list_id: priceListId,
      item_name: data.item_name.trim(),
      item_code: data.item_code.trim().toUpperCase(),
      tier: data.tier,
      unit_price: data.unit_price,
      quantity_breakpoint: data.quantity_breakpoint || null,
      discount_percentage: data.discount_percentage || 0,
      description: data.description || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Update price list item
   */
  async updateItem(
    itemId: number,
    priceListId: number,
    zoneId: number,
    userId: number,
    data: UpdatePriceListItemRequest
  ): Promise<PriceListItem> {
    // Verify price list exists
    const priceList = await this.getPriceListById(priceListId, zoneId);
    if (!priceList) {
      throw new Error("Price list not found");
    }

    // Get existing item
    const existingItem = await this.database.execute(
      `SELECT id, price_list_id, item_name, item_code, tier, unit_price,
              quantity_breakpoint, discount_percentage, description, is_active,
              created_at, updated_at
       FROM price_list_items
       WHERE id = ? AND price_list_id = ?`,
      [itemId, priceListId]
    );

    if ((existingItem[0] as any[]).length === 0) {
      throw new Error("Item not found");
    }

    const item = (existingItem[0] as any[])[0];

    const updates: string[] = [];
    const values: any[] = [];

    if (data.item_name !== undefined) {
      if (data.item_name.trim().length === 0) {
        throw new Error("Item name cannot be empty");
      }
      if (
        data.item_name.length > PRICING_VALIDATION_RULES.item_name_max_length
      ) {
        throw new Error(
          `Item name must not exceed ${PRICING_VALIDATION_RULES.item_name_max_length} characters`
        );
      }
      updates.push("item_name = ?");
      values.push(data.item_name.trim());
    }

    if (data.item_code !== undefined) {
      if (data.item_code.trim().length === 0) {
        throw new Error("Item code cannot be empty");
      }
      if (
        data.item_code.length > PRICING_VALIDATION_RULES.item_code_max_length
      ) {
        throw new Error(
          `Item code must not exceed ${PRICING_VALIDATION_RULES.item_code_max_length} characters`
        );
      }

      // Check for duplicates
      const duplicateCheck = await this.database.execute(
        `SELECT id FROM price_list_items
         WHERE price_list_id = ? AND item_code = ? AND id != ?`,
        [priceListId, data.item_code.trim().toUpperCase(), itemId]
      );

      if ((duplicateCheck[0] as any[]).length > 0) {
        throw new Error(`Item code "${data.item_code}" already exists`);
      }

      updates.push("item_code = ?");
      values.push(data.item_code.trim().toUpperCase());
    }

    if (data.tier !== undefined) {
      if (!Object.values(PRICING_TIER_TYPES).includes(data.tier)) {
        throw new Error(`Invalid pricing tier: ${data.tier}`);
      }
      updates.push("tier = ?");
      values.push(data.tier);
    }

    if (data.unit_price !== undefined) {
      if (
        data.unit_price < PRICING_VALIDATION_RULES.min_unit_price ||
        data.unit_price > PRICING_VALIDATION_RULES.max_unit_price
      ) {
        throw new Error(
          `Unit price must be between ${PRICING_VALIDATION_RULES.min_unit_price} and ${PRICING_VALIDATION_RULES.max_unit_price}`
        );
      }
      updates.push("unit_price = ?");
      values.push(data.unit_price);
    }

    if (data.quantity_breakpoint !== undefined) {
      updates.push("quantity_breakpoint = ?");
      values.push(data.quantity_breakpoint || null);
    }

    if (data.discount_percentage !== undefined) {
      if (
        data.discount_percentage < PRICING_VALIDATION_RULES.min_discount ||
        data.discount_percentage > PRICING_VALIDATION_RULES.max_discount
      ) {
        throw new Error(
          `Discount percentage must be between ${PRICING_VALIDATION_RULES.min_discount} and ${PRICING_VALIDATION_RULES.max_discount}`
        );
      }
      updates.push("discount_percentage = ?");
      values.push(data.discount_percentage);
    }

    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description || null);
    }

    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return item;
    }

    updates.push("updated_at = NOW()");
    values.push(itemId, priceListId);

    const sql = `UPDATE price_list_items SET ${updates.join(
      ", "
    )} WHERE id = ? AND price_list_id = ?`;

    await this.database.execute(sql, values);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "update",
      entityType: "price_list_item",
      entityId: itemId,
      oldValue: item,
      newValue: data,
    });

    const updated = await this.database.execute(
      `SELECT id, price_list_id, item_name, item_code, tier, unit_price,
              quantity_breakpoint, discount_percentage, description, is_active,
              created_at, updated_at
       FROM price_list_items
       WHERE id = ? AND price_list_id = ?`,
      [itemId, priceListId]
    );

    return (updated[0] as any[])[0] as PriceListItem;
  }

  /**
   * Delete price list (soft delete)
   */
  async deletePriceList(
    priceListId: number,
    zoneId: number,
    userId: number
  ): Promise<void> {
    const priceList = await this.getPriceListById(priceListId, zoneId);
    if (!priceList) {
      throw new Error("Price list not found");
    }

    const sql = `
      UPDATE price_lists
      SET is_active = 0, updated_at = NOW()
      WHERE id = ? AND zone_id = ?
    `;

    await this.database.execute(sql, [priceListId, zoneId]);

    // Audit log
    await this.auditLogger.log({
      zoneId,
      userId,
      action: "delete",
      entityType: "price_list",
      entityId: priceListId,
      oldValue: { id: priceListId },
      newValue: null,
    });
  }

  /**
   * Get pricing audit history
   */
  async getPricingAuditHistory(
    priceListId: number,
    zoneId: number,
    limit: number = 50
  ): Promise<PricingAuditEntry[]> {
    const sql = `
      SELECT pa.id, pa.price_list_id, pa.action, pa.changed_by,
             pa.old_value, pa.new_value, pa.change_reason, pa.created_at
      FROM pricing_audit pa
      WHERE pa.price_list_id = ?
      ORDER BY pa.created_at DESC
      LIMIT ?
    `;

    const results = await this.database.execute(sql, [priceListId, limit]);
    return results[0] as any[] as PricingAuditEntry[];
  }

  /**
   * Compare prices across multiple price lists
   */
  async comparePriceLists(
    zoneId: number,
    itemCode: string,
    limit: number = 10
  ): Promise<any[]> {
    const sql = `
      SELECT pl.id, pl.name, pli.item_name, pli.item_code, pli.tier,
             pli.unit_price, pli.discount_percentage, pli.created_at
      FROM price_lists pl
      INNER JOIN price_list_items pli ON pl.id = pli.price_list_id
      WHERE pl.zone_id = ? AND pli.item_code = ? AND pl.is_active = 1
      ORDER BY pli.unit_price ASC
      LIMIT ?
    `;

    const results = await this.database.execute(sql, [
      zoneId,
      itemCode.toUpperCase(),
      limit,
    ]);

    return results[0] as any[];
  }
}
