import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PurchaseOrderService } from '../services/purchase-order.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const poService = new PurchaseOrderService();

const createPOSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  expectedDeliveryDate: z.string().min(1, 'Delivery date is required'),
  lineItems: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      orderedQty: z.number().min(1, 'Ordered qty must be >= 1'),
      unitPrice: z.number().min(0, 'Unit price must be >= 0')
    })
  ).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  submitForApproval: z.boolean().optional()
});

const receiveGoodsSchema = z.object({
  poId: z.string().min(1, 'PO ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      receivedQty: z.number().min(0, 'Received qty must be >= 0'),
      rejectedQty: z.number().optional(),
      binCode: z.string().optional(),
      batchNumber: z.string().optional(),
      expiryDate: z.string().optional()
    })
  ).min(1, 'At least one receiving item is required'),
  notes: z.string().optional()
});

const matchInvoiceSchema = z.object({
  invoiceAmount: z.number().min(0, 'Invoice amount must be >= 0')
});

const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISCREPANCY'])
});

export class PurchaseOrderController {
  static async createPO(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createPOSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const po = await poService.createPO(tenantId, userId, validatedData);

      return ApiResponse.success(res, 201, 'Purchase Order created successfully', po);
    } catch (error) {
      next(error);
    }
  }

  static async listPOs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { status, supplierId } = req.query;
      const pos = await poService.listPOs(tenantId, status as string, supplierId as string);

      return ApiResponse.success(res, 200, 'Purchase orders retrieved successfully', pos);
    } catch (error) {
      next(error);
    }
  }

  static async getPOById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const data = await poService.getPOById(id, tenantId);

      return ApiResponse.success(res, 200, 'Purchase Order retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  static async approvePO(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const approverId = req.user!.userId;
      const po = await poService.approvePO(id, tenantId, approverId);

      return ApiResponse.success(res, 200, 'PO approved successfully', po);
    } catch (error) {
      next(error);
    }
  }

  static async rejectPO(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const approverId = req.user!.userId;
      const { reason } = req.body;
      const po = await poService.rejectPO(id, tenantId, approverId, reason || 'Rejected during review');

      return ApiResponse.success(res, 200, 'PO rejected successfully', po);
    } catch (error) {
      next(error);
    }
  }

  static async issuePO(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const po = await poService.issuePO(id, tenantId);

      return ApiResponse.success(res, 200, 'PO issued to supplier successfully', po);
    } catch (error) {
      next(error);
    }
  }

  static async receiveGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = receiveGoodsSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const result = await poService.receiveGoods(tenantId, userId, validatedData);

      return ApiResponse.success(res, 200, 'Goods received and stock updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async match3WayInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = matchInvoiceSchema.parse(req.body);
      const po = await poService.match3WayInvoice(id, tenantId, validatedData.invoiceAmount);

      return ApiResponse.success(res, 200, '3-Way invoice match processed', po);
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = updatePaymentStatusSchema.parse(req.body);
      const po = await poService.updatePaymentStatus(id, tenantId, validatedData.paymentStatus);

      return ApiResponse.success(res, 200, 'Payment status updated successfully', po);
    } catch (error) {
      next(error);
    }
  }
}
