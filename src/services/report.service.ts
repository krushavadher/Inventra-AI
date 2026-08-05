import { InventoryRepository } from '../repositories/inventory.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { WarehouseRepository } from '../repositories/warehouse.repository.js';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';

export class ReportService {
  private inventoryRepo = new InventoryRepository();
  private supplierRepo = new SupplierRepository();
  private warehouseRepo = new WarehouseRepository();
  private poRepo = new PurchaseOrderRepository();
  private productRepo = new ProductRepository();

  /**
   * Helper: Convert Array of Objects to CSV String
   */
  private jsonToCSV(items: Record<string, any>[]): string {
    if (!items || items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const csvRows = [headers.join(',')];

    for (const item of items) {
      const values = headers.map((header) => {
        const val = item[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * 1. Inventory Valuation & Stock Balance Report
   */
  async generateInventoryReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const products = await this.productRepo.queryProducts({ tenantId, limit: 100 });

    const reportRows = products.products.map((p) => ({
      SKU: p.sku,
      ProductName: p.name,
      Category: (p.categoryId as any)?.name || 'Uncategorized',
      UnitCostUSD: p.pricing.unitCost,
      SellingPriceUSD: p.pricing.sellingPrice,
      TaxRatePercent: p.pricing.taxRate,
      ABCClass: p.abcClass,
      Status: p.status
    }));

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Inventory_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }

  /**
   * 2. Supplier Performance & OTIF Scorecard Report
   */
  async generateSupplierReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const suppliers = await this.supplierRepo.findAll(tenantId);

    const reportRows = suppliers.map((s) => ({
      VendorCode: s.code,
      CompanyName: s.name,
      ContactPerson: s.contact.primaryName,
      ContactEmail: s.contact.email,
      PaymentTerms: s.paymentTerms,
      DefaultLeadTimeDays: s.leadTime.defaultDays,
      OTIFRatingScore: `${s.performance.otifScore}%`,
      DefectRatePercent: `${s.performance.defectRatePercent}%`,
      TotalSpendUSD: s.performance.totalSpendAmount,
      RiskLevel: s.performance.riskLevel
    }));

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Supplier_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }

  /**
   * 3. Sales & Fulfillment Report
   */
  async generateSalesReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const reportRows = [
      { OrderID: 'SO-10942', Channel: 'B2B Enterprise', Customer: 'Acme Global', TotalValueUSD: 45000, FulfillmentStatus: 'ALLOCATED', ShipWarehouse: 'WH-EAST-01' },
      { OrderID: 'SO-10943', Channel: 'Shopify Store', Customer: 'John Doe', TotalValueUSD: 249.99, FulfillmentStatus: 'SHIPPED', ShipWarehouse: 'WH-WEST-02' }
    ];

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Sales_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }

  /**
   * 4. Warehouse Capacity & Zone Utilization Report
   */
  async generateWarehouseReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const warehouses = await this.warehouseRepo.findAll(tenantId);

    const reportRows = warehouses.map((wh) => ({
      WarehouseCode: wh.code,
      WarehouseName: wh.name,
      FacilityType: wh.type,
      City: wh.address.city,
      Country: wh.address.country,
      TotalVolumeCapacityM3: wh.totalCapacityVolume,
      TotalWeightCapacityKg: wh.totalCapacityWeight,
      Status: wh.status
    }));

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Warehouse_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }

  /**
   * 5. AI Demand Forecast Prediction Report
   */
  async generateForecastReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const reportRows = [
      { SKU: 'SKU-8842-MCU', ProductName: 'Microcontroller Unit Dual-Core', CurrentAvailableStock: 5, Predicted30DayDemand: 1000, SafetyStockLimit: 20, DeficitDate: '2026-08-08', RecommendedReorderQty: 1000 },
      { SKU: 'SKU-9941-SENS', ProductName: 'Thermal Precision Sensor Pack', CurrentAvailableStock: 1, Predicted30DayDemand: 250, SafetyStockLimit: 10, DeficitDate: '2026-08-09', RecommendedReorderQty: 350 }
    ];

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Demand_Forecast_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }

  /**
   * 6. Procurement & Purchase Order History Report
   */
  async generateProcurementReport(tenantId: string, format: 'JSON' | 'CSV' = 'JSON') {
    const pos = await this.poRepo.findAll(tenantId);

    const reportRows = pos.map((po) => ({
      PONumber: po.poNumber,
      SupplierName: (po.supplierId as any)?.name || 'N/A',
      WarehouseCode: (po.warehouseId as any)?.code || 'N/A',
      TotalAmountUSD: po.totalAmount,
      POStatus: po.status,
      PaymentStatus: po.paymentStatus,
      ThreeWayMatchStatus: po.matchStatus,
      ExpectedDeliveryDate: po.expectedDeliveryDate,
      CreatedBy: (po.createdBy as any)?.firstName || 'System'
    }));

    if (format === 'CSV') {
      return { contentType: 'text/csv', data: this.jsonToCSV(reportRows), filename: 'StockMind_Procurement_Report.csv' };
    }
    return { contentType: 'application/json', data: reportRows };
  }
}
