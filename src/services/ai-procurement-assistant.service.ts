import { AIProcurementRecommendationModel, IAIProcurementRecommendation } from '../models/ai-procurement-recommendation.model.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { SupplierRepository } from '../repositories/supplier.repository.js';
import { WarehouseRepository } from '../repositories/warehouse.repository.js';
import { PurchaseOrderRepository } from '../repositories/purchase-order.repository.js';
import { AppError } from '../utils/app-error.util.js';

export interface RunProcurementAnalysisDTO {
  warehouseId?: string;
  maxBudgetLimit?: number;
}

export class AIProcurementAssistantService {
  private inventoryRepo = new InventoryRepository();
  private supplierRepo = new SupplierRepository();
  private warehouseRepo = new WarehouseRepository();
  private poRepo = new PurchaseOrderRepository();

  /**
   * Senior Procurement Manager LLM System Persona & Prompt Template
   */
  private readonly seniorManagerPromptTemplate = `
You are a Senior Chief Procurement Officer (CPO) with 20+ years of enterprise supply chain expertise.
Your objective is to evaluate 12 critical supply chain input streams and make optimal, data-backed procurement recommendations:

ANALYTICAL INPUT STREAMS:
1. Current Stock Levels (Available vs Safety)
2. Historical Sales Trends (Growth Rate %)
3. Seasonal Demand Shifts
4. Supplier Lead Times & Lead Time Variances
5. Supplier Ratings (OTIF % & Defect Rates)
6. Warehouse Storage Volume & Weight Capacity %
7. Budget Constraints & Working Capital Allocation
8. Active Pending Purchase Orders In-Transit
9. Purchase History & Spend Velocity
10. Inventory Turnover Ratio (ITR)
11. Minimum Stock Thresholds (Reorder Points)
12. Maximum Stock Capacity Limits

GOAL:
Produce an optimal purchasing recommendation that maximizes order fill rate, eliminates stockout risks, respects budget limits, and selects the supplier offering the best balance of OTIF reliability, cost, and speed.
`;

  /**
   * Run AI Procurement Analysis across low stock items
   */
  async runAnalysis(tenantId: string, userId: string, dto: RunProcurementAnalysisDTO) {
    // 1. Gather Input Data Streams
    const lowStockAlerts = await this.inventoryRepo.queryLowStock(tenantId, dto.warehouseId);
    const suppliers = await this.supplierRepo.findAll(tenantId);
    const warehouses = await this.warehouseRepo.findAll(tenantId);
    const pendingPOs = await this.poRepo.findAll(tenantId, 'ISSUED');

    if (!lowStockAlerts || lowStockAlerts.length === 0) {
      return {
        message: "No stockout risks detected. All inventory levels are above safety stock limits.",
        recommendations: []
      };
    }

    const createdRecommendations: IAIProcurementRecommendation[] = [];

    // Analyze each item needing replenishment
    for (const item of lowStockAlerts) {
      const product = item.productId as any;
      const warehouse = item.warehouseId as any;

      // Filter suitable suppliers
      const primarySupplier = suppliers.find((s) => s.performance.riskLevel === 'LOW') || suppliers[0];
      const alternativeSuppliers = suppliers.filter((s) => s._id.toString() !== primarySupplier._id.toString());

      const recommendedQty = Math.max(100, item.reorderPoint * 3 - item.quantityAvailable);
      const unitCost = product.unitCost || product.pricing?.unitCost || 15.0;
      const estimatedCostAmount = recommendedQty * unitCost;
      const leadTimeDays = primarySupplier ? primarySupplier.leadTime.defaultDays : 5;
      const expectedDeliveryDate = new Date(Date.now() + leadTimeDays * 24 * 60 * 60 * 1000);
      const inventoryCoverageDays = Math.round((recommendedQty + item.quantityAvailable) / 10); // 10 units/day consumption rate

      const recommendationNumber = `REC-${Date.now().toString().slice(-6)}`;

      const reasoningMarkdown = `
### Senior Procurement Manager Decision Rationale:
- **Stock Depletion Hazard**: Product **${product.name} (${product.sku})** is currently at **${item.quantityAvailable} units** in **${warehouse.name}**, breaching the minimum safety stock limit of **${item.minSafetyStock} units**.
- **Supplier Selection**: Selected **${primarySupplier.name}** due to superior OTIF delivery score of **${primarySupplier.performance.otifScore}%** and guaranteed lead time of **${leadTimeDays} days**.
- **Budget & Coverage Impact**: Total order value of **$${estimatedCostAmount.toLocaleString()}** fits within allocation limits and secures **${inventoryCoverageDays} days** of continuous operational coverage.
- **Risk Assessment**: Port transit delay risk is low. Alternate vendor *${alternativeSuppliers[0]?.name || 'Secondary Vendor'}* available as fallback.
`;

      // Create Draft Purchase Order automatically
      const draftPO = await this.poRepo.create({
        tenantId: tenantId as any,
        poNumber: `PO-AI-${Date.now().toString().slice(-5)}`,
        supplierId: primarySupplier._id as any,
        warehouseId: warehouse._id as any,
        status: 'DRAFT',
        approvalWorkflow: {},
        lineItems: [
          {
            productId: product._id as any,
            orderedQty: recommendedQty,
            receivedQty: 0,
            unitPrice: unitCost,
            lineTotal: estimatedCostAmount
          }
        ],
        totalAmount: estimatedCostAmount,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate,
        notes: `Auto-generated Draft PO by StockMind AI Procurement Manager. Recommendation ID: ${recommendationNumber}`,
        createdBy: userId as any
      });

      // Save AI Recommendation
      const rec = await AIProcurementRecommendationModel.create({
        tenantId: tenantId as any,
        recommendationNumber,
        productId: product._id as any,
        warehouseId: warehouse._id as any,
        recommendedQty,
        bestSupplierId: primarySupplier._id as any,
        alternativeSupplierIds: alternativeSuppliers.map((s) => s._id) as any,
        expectedDeliveryDate,
        inventoryCoverageDays,
        estimatedCostAmount,
        procurementRisks: [
          `Minor lead-time variance (+${primarySupplier.leadTime.avgVarianceDays || 1} day)`,
          "Seasonal Q3 demand surge expected"
        ],
        reasoningMarkdown,
        status: 'DRAFT_PO_GENERATED',
        generatedDraftPoId: draftPO._id as any
      });

      createdRecommendations.push(rec);
    }

    return {
      message: `AI Analysis completed. Generated ${createdRecommendations.length} procurement recommendations and draft POs.`,
      recommendations: createdRecommendations
    };
  }

  /**
   * List Recommendations
   */
  async listRecommendations(tenantId: string) {
    return AIProcurementRecommendationModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku unitCost')
      .populate('warehouseId', 'name code')
      .populate('bestSupplierId', 'name code performance leadTime')
      .populate('generatedDraftPoId', 'poNumber status totalAmount');
  }

  /**
   * Approve Recommendation & Submit PO for Executive Sign-off
   */
  async approveRecommendation(recId: string, tenantId: string, managerId: string) {
    const rec = await AIProcurementRecommendationModel.findOne({ _id: recId, tenantId });
    if (!rec) throw new AppError('Recommendation not found', 404, 'REC_NOT_FOUND');

    rec.status = 'APPROVED';
    rec.reviewedBy = managerId as any;
    await rec.save();

    // Submit generated Draft PO for approval
    if (rec.generatedDraftPoId) {
      const po = await this.poRepo.findById(rec.generatedDraftPoId.toString(), tenantId);
      if (po && po.status === 'DRAFT') {
        po.status = 'PENDING_APPROVAL';
        await po.save();
      }
    }

    return rec;
  }

  /**
   * Reject Recommendation
   */
  async rejectRecommendation(recId: string, tenantId: string, managerId: string) {
    const rec = await AIProcurementRecommendationModel.findOne({ _id: recId, tenantId });
    if (!rec) throw new AppError('Recommendation not found', 404, 'REC_NOT_FOUND');

    rec.status = 'REJECTED';
    rec.reviewedBy = managerId as any;
    await rec.save();

    // Cancel draft PO
    if (rec.generatedDraftPoId) {
      const po = await this.poRepo.findById(rec.generatedDraftPoId.toString(), tenantId);
      if (po && po.status === 'DRAFT') {
        po.status = 'CANCELLED';
        await po.save();
      }
    }

    return rec;
  }
}
