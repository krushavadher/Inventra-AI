import { InventoryRepository, InventoryQueryFilter } from '../repositories/inventory.repository.js';
import { AppError } from '../utils/app-error.util.js';

export interface StockInDTO {
  warehouseId: string;
  productId: string;
  quantity: number;
  binCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  referenceDocType?: 'PO' | 'MANUAL';
  referenceDocId?: string;
  notes?: string;
}

export interface StockOutDTO {
  warehouseId: string;
  productId: string;
  quantity: number;
  binCode?: string;
  batchNumber?: string;
  referenceDocType?: 'SO' | 'MANUAL';
  referenceDocId?: string;
  reason?: string;
}

export interface StockAdjustmentDTO {
  warehouseId: string;
  productId: string;
  quantityDelta: number;
  binCode?: string;
  batchNumber?: string;
  reason: string;
}

export interface StockTransferDTO {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: { productId: string; quantity: number; batchNumber?: string }[];
  notes?: string;
}

export class InventoryService {
  private inventoryRepo = new InventoryRepository();

  /**
   * Query Inventory with Filters, Search, Sorting, and Pagination
   */
  async queryInventory(tenantId: string, options: InventoryQueryFilter) {
    return this.inventoryRepo.queryLevels(tenantId, options);
  }

  /**
   * Get Summary KPI Metrics
   */
  async getSummaryKPIs(tenantId: string) {
    return this.inventoryRepo.getSummaryKPIs(tenantId);
  }

  /**
   * Get AI Procurement Recommendations
   */
  async getAIRecommendations(tenantId: string) {
    return this.inventoryRepo.getAIRecommendations(tenantId);
  }

  /**
   * Get AI Actionable Alerts
   */
  async getAIAlerts(tenantId: string) {
    return this.inventoryRepo.getAIAlerts(tenantId);
  }

  /**
   * Get Analytics & Chart Data
   */
  async getAnalyticsData(tenantId: string) {
    return this.inventoryRepo.getAnalyticsData(tenantId);
  }

  /**
   * Create New Inventory Product Item
   */
  async createItem(tenantId: string, data: any) {
    if (!data.name || !data.sku) {
      throw new AppError('Product Name and SKU are required', 400, 'MISSING_FIELDS');
    }
    return this.inventoryRepo.createItem(tenantId, data);
  }

  /**
   * Update Inventory Item
   */
  async updateItem(tenantId: string, id: string, data: any) {
    const updated = await this.inventoryRepo.updateItem(tenantId, id, data);
    if (!updated) {
      throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
    }
    return updated;
  }

  /**
   * Delete Inventory Item
   */
  async deleteItem(tenantId: string, id: string) {
    return this.inventoryRepo.deleteItem(tenantId, id);
  }

  /**
   * 1. Stock In (Inbound Receiving)
   */
  async stockIn(tenantId: string, userId: string, dto: StockInDTO) {
    if (dto.quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400, 'INVALID_QUANTITY');
    }

    const binCode = dto.binCode || 'BIN-A-01';
    const batchNumber = dto.batchNumber || 'BATCH-IN-01';
    const expiry = dto.expiryDate ? new Date(dto.expiryDate) : undefined;

    const existingStock = await this.inventoryRepo.findStockLevel(tenantId, dto.warehouseId, dto.productId);
    const balanceBefore = existingStock ? existingStock.quantityOnHand : 0;

    const updatedStock = await this.inventoryRepo.upsertStockLevel(
      tenantId,
      dto.warehouseId,
      dto.productId,
      binCode,
      batchNumber,
      dto.quantity,
      expiry,
      'IN_STOCK'
    );

    await this.inventoryRepo.recordMovement({
      tenantId,
      movementType: 'STOCK_IN',
      productName: existingStock?.productId?.name || 'Microcontroller Unit Dual-Core',
      sku: existingStock?.productId?.sku || 'MCU-8842-DC',
      warehouseName: existingStock?.warehouseId?.name || 'East Coast Main DC',
      quantity: dto.quantity,
      balanceBefore,
      balanceAfter: updatedStock.quantityOnHand,
      reason: dto.notes || 'Inbound Stock Arrival',
      performedBy: userId
    });

    return updatedStock;
  }

  /**
   * 2. Stock Out (Outbound Picking)
   */
  async stockOut(tenantId: string, userId: string, dto: StockOutDTO) {
    if (dto.quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400, 'INVALID_QUANTITY');
    }

    const stock = await this.inventoryRepo.findStockLevel(tenantId, dto.warehouseId, dto.productId);
    const balanceBefore = stock ? stock.quantityOnHand : 0;

    const updatedStock = await this.inventoryRepo.upsertStockLevel(
      tenantId,
      dto.warehouseId,
      dto.productId,
      dto.binCode || 'BIN-A-01',
      dto.batchNumber || 'BATCH-OUT-01',
      -dto.quantity
    );

    await this.inventoryRepo.recordMovement({
      tenantId,
      movementType: 'STOCK_OUT',
      productName: stock?.productId?.name || 'Inventory Item',
      sku: stock?.productId?.sku || 'SKU-OUT',
      warehouseName: stock?.warehouseId?.name || 'Main Warehouse',
      quantity: dto.quantity,
      balanceBefore,
      balanceAfter: updatedStock.quantityOnHand,
      reason: dto.reason || 'Outbound Order Dispatch',
      performedBy: userId
    });

    return updatedStock;
  }

  /**
   * 3. Stock Adjustment
   */
  async adjustStock(tenantId: string, userId: string, dto: StockAdjustmentDTO) {
    if (dto.quantityDelta === 0) {
      throw new AppError('Quantity delta cannot be zero', 400, 'INVALID_QUANTITY');
    }

    const stock = await this.inventoryRepo.findStockLevel(tenantId, dto.warehouseId, dto.productId);
    const balanceBefore = stock ? stock.quantityOnHand : 0;

    const updatedStock = await this.inventoryRepo.upsertStockLevel(
      tenantId,
      dto.warehouseId,
      dto.productId,
      dto.binCode || 'BIN-A-01',
      dto.batchNumber || 'BATCH-ADJ',
      dto.quantityDelta
    );

    await this.inventoryRepo.recordMovement({
      tenantId,
      movementType: 'ADJUSTMENT',
      productName: stock?.productId?.name || 'Inventory Item',
      sku: stock?.productId?.sku || 'SKU-ADJ',
      warehouseName: stock?.warehouseId?.name || 'Main Warehouse',
      quantity: dto.quantityDelta,
      balanceBefore,
      balanceAfter: updatedStock.quantityOnHand,
      reason: dto.reason || 'Cycle Count Correction',
      performedBy: userId
    });

    return updatedStock;
  }

  /**
   * 4. Inter-Warehouse Stock Transfer
   */
  async createStockTransfer(tenantId: string, userId: string, dto: StockTransferDTO) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new AppError('Source and destination warehouse cannot be the same', 400, 'INVALID_TRANSFER');
    }

    return this.inventoryRepo.createTransfer({
      tenantId,
      fromWarehouseId: dto.fromWarehouseId,
      toWarehouseId: dto.toWarehouseId,
      items: dto.items,
      createdBy: userId,
      notes: dto.notes
    });
  }

  async getExpiredProducts(tenantId: string) {
    return this.inventoryRepo.queryExpiredOrDamaged(tenantId, 'EXPIRED');
  }

  async getDamagedProducts(tenantId: string) {
    return this.inventoryRepo.queryExpiredOrDamaged(tenantId, 'DAMAGED');
  }

  async getMovementHistory(tenantId: string, productId?: string, warehouseId?: string, page: number = 1, limit: number = 10) {
    return this.inventoryRepo.queryMovements(tenantId, productId, warehouseId, page, limit);
  }

  async getInventoryValuation(tenantId: string) {
    const res = await this.inventoryRepo.calculateInventoryValue(tenantId);
    return res[0];
  }

  async getLowStockAlerts(tenantId: string, warehouseId?: string) {
    return this.inventoryRepo.queryLowStock(tenantId, warehouseId);
  }
}
