import { PurchaseOrderModel, IPurchaseOrder } from '../models/purchase-order.model.js';
import { GoodsReceiptModel, IGoodsReceiptNote } from '../models/goods-receipt.model.js';
import { SupplierModel } from '../models/supplier.model.js';
import { WarehouseModel } from '../models/warehouse.model.js';
import { ProductModel } from '../models/product.model.js';
import mongoose from 'mongoose';

const memoryPOs: Map<string, IPurchaseOrder> = new Map();
const memoryGRNs: IGoodsReceiptNote[] = [];

export class PurchaseOrderRepository {
  async findById(id: string, tenantId: string): Promise<IPurchaseOrder | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const po = await PurchaseOrderModel.findOne({ _id: id, isDeleted: false })
            .populate('supplierId', 'name code contact paymentTerms')
            .populate('warehouseId', 'name code')
            .populate('lineItems.productId', 'name sku unitCost sellingPrice')
            .populate('createdBy', 'firstName lastName email');
          if (po) return po;
        }
      } catch (e) {}
    }

    const p = memoryPOs.get(id);
    if (p && !p.isDeleted) return p;
    return null;
  }

  async findByPoNumber(poNumber: string, tenantId: string): Promise<IPurchaseOrder | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const po = await PurchaseOrderModel.findOne({ poNumber: poNumber.toUpperCase(), isDeleted: false });
        if (po) return po;
      } catch (e) {}
    }

    for (const p of memoryPOs.values()) {
      if (p.poNumber.toUpperCase() === poNumber.toUpperCase() && !p.isDeleted) return p;
    }
    return null;
  }

  async findAll(tenantId: string, status?: string, supplierId?: string): Promise<IPurchaseOrder[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter: any = { isDeleted: false };
        if (status && status !== 'ALL') filter.status = status;
        if (supplierId && supplierId !== 'ALL' && mongoose.Types.ObjectId.isValid(supplierId)) {
          filter.supplierId = new mongoose.Types.ObjectId(supplierId);
        }

        const pos = await PurchaseOrderModel.find(filter)
          .sort({ createdAt: -1 })
          .populate('supplierId', 'name code')
          .populate('warehouseId', 'name code')
          .populate('lineItems.productId', 'name sku')
          .populate('createdBy', 'firstName lastName');

        return pos;
      } catch (e) {
        console.warn('findAll PO Mongoose error:', e);
      }
    }

    let items = Array.from(memoryPOs.values()).filter((p) => !p.isDeleted);
    if (status && status !== 'ALL') items = items.filter((p) => p.status === status);
    return items;
  }

  async create(data: Partial<IPurchaseOrder>): Promise<IPurchaseOrder> {
    if (mongoose.connection.readyState === 1) {
      try {
        // Resolve or create valid Supplier ObjectId
        let validSupplierId: any = data.supplierId;
        if (!validSupplierId || !mongoose.Types.ObjectId.isValid(validSupplierId as any)) {
          let sup = await SupplierModel.findOne({ isDeleted: false });
          if (!sup) {
            sup = await SupplierModel.create({
              tenantId: mongoose.Types.ObjectId.isValid(data.tenantId as any) ? data.tenantId : new mongoose.Types.ObjectId(),
              code: 'SUP-8840',
              name: 'TechComponents Microdevices Inc.',
              taxId: 'TAX-994810',
              contact: { primaryName: 'Robert Vance', email: 'vance@techcomponents.com', phone: '+1 555 019 2831' },
              leadTime: { defaultDays: 5, minDays: 3, maxDays: 7 },
              paymentTerms: 'NET_30',
              performance: { otifScore: 98.4, defectRatePercent: 0.2, totalOrdersCompleted: 10, totalSpendAmount: 150000, riskLevel: 'LOW' }
            });
          }
          validSupplierId = sup._id;
        }

        // Resolve or create valid Warehouse ObjectId
        let validWarehouseId: any = data.warehouseId;
        if (!validWarehouseId || !mongoose.Types.ObjectId.isValid(validWarehouseId as any)) {
          let wh = await WarehouseModel.findOne({ isDeleted: false });
          if (!wh) {
            wh = await WarehouseModel.create({
              tenantId: mongoose.Types.ObjectId.isValid(data.tenantId as any) ? data.tenantId : new mongoose.Types.ObjectId(),
              code: 'WH-EAST-01',
              name: 'East Coast Main Distribution Center',
              type: 'DISTRIBUTION_CENTER',
              totalCapacityVolume: 50000,
              totalCapacityWeight: 100000,
              status: 'ACTIVE'
            });
          }
          validWarehouseId = wh._id;
        }

        // Resolve or create valid Product ObjectId for Line Items
        let defaultProduct = await ProductModel.findOne({ isDeleted: false });
        if (!defaultProduct) {
          defaultProduct = await ProductModel.create({
            tenantId: mongoose.Types.ObjectId.isValid(data.tenantId as any) ? data.tenantId : new mongoose.Types.ObjectId(),
            sku: 'SKU-8842-MCU',
            name: 'Microcontroller Unit Dual-Core 32-bit',
            categoryId: new mongoose.Types.ObjectId(),
            barcode: '890123456701',
            pricing: { unitCost: 1200, sellingPrice: 1850 }
          });
        }

        const formattedItems = (data.lineItems || []).map((item: any) => {
          let pid = item.productId;
          if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
            pid = defaultProduct!._id;
          }
          return {
            productId: pid,
            orderedQty: Number(item.orderedQty) || 1,
            receivedQty: Number(item.receivedQty) || 0,
            unitPrice: Number(item.unitPrice) || 100,
            lineTotal: (Number(item.orderedQty) || 1) * (Number(item.unitPrice) || 100)
          };
        });

        let validCreatedBy: any = data.createdBy;
        if (!validCreatedBy || !mongoose.Types.ObjectId.isValid(validCreatedBy as any)) {
          validCreatedBy = new mongoose.Types.ObjectId();
        }

        const po = await PurchaseOrderModel.create({
          tenantId: mongoose.Types.ObjectId.isValid(data.tenantId as any) ? data.tenantId : new mongoose.Types.ObjectId(),
          poNumber: data.poNumber || `PO-${Date.now().toString().slice(-5)}`,
          supplierId: validSupplierId,
          warehouseId: validWarehouseId,
          status: data.status || 'PENDING_APPROVAL',
          lineItems: formattedItems,
          totalAmount: data.totalAmount || 1000,
          paymentStatus: data.paymentStatus || 'UNPAID',
          matchStatus: data.matchStatus || 'PENDING',
          expectedDeliveryDate: data.expectedDeliveryDate || new Date(),
          createdBy: validCreatedBy,
          notes: data.notes
        });

        // Return populated PO object
        const populatedPO = await PurchaseOrderModel.findById(po._id)
          .populate('supplierId', 'name code')
          .populate('warehouseId', 'name code')
          .populate('lineItems.productId', 'name sku');

        return populatedPO || po;
      } catch (e) {
        console.warn('create PO Mongoose error:', e);
      }
    }

    const mockId = data._id ? data._id.toString() : `po_${Date.now()}`;
    const mockPO: any = {
      _id: mockId,
      tenantId: data.tenantId,
      poNumber: data.poNumber || `PO-${Date.now().toString().slice(-5)}`,
      supplierId: { _id: 'sup_101', name: 'TechComponents Microdevices Inc.', code: 'SUP-8840' },
      warehouseId: { _id: 'wh_east_01', name: 'East Coast Main DC', code: 'WH-EAST-01' },
      status: data.status || 'PENDING_APPROVAL',
      lineItems: data.lineItems || [],
      totalAmount: data.totalAmount || 1000,
      paymentStatus: data.paymentStatus || 'UNPAID',
      matchStatus: data.matchStatus || 'PENDING',
      expectedDeliveryDate: data.expectedDeliveryDate || new Date(),
      isDeleted: false,
      createdAt: new Date(),
      save: async () => mockPO
    };
    memoryPOs.set(mockId, mockPO);
    return mockPO;
  }

  async update(id: string, tenantId: string, updateData: Partial<IPurchaseOrder>): Promise<IPurchaseOrder | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          const po = await PurchaseOrderModel.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, { new: true });
          if (po) return po;
        }
      } catch (e) {}
    }

    const p = memoryPOs.get(id);
    if (p) {
      Object.assign(p, updateData);
      return p;
    }
    return null;
  }

  async createGRN(data: Partial<IGoodsReceiptNote>): Promise<IGoodsReceiptNote> {
    if (mongoose.connection.readyState === 1) {
      try {
        const grn = await GoodsReceiptModel.create(data);
        return grn;
      } catch (e) {
        console.warn('createGRN Mongoose error:', e);
      }
    }

    const mockGRN: any = {
      _id: `grn_${Date.now()}`,
      tenantId: data.tenantId,
      grnNumber: data.grnNumber,
      poId: data.poId,
      warehouseId: data.warehouseId,
      receivedItems: data.receivedItems || [],
      receivedBy: data.receivedBy,
      receivedAt: new Date()
    };
    memoryGRNs.push(mockGRN);
    return mockGRN;
  }

  async findGRNsByPo(poId: string, tenantId: string): Promise<IGoodsReceiptNote[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        if (mongoose.Types.ObjectId.isValid(poId)) {
          const grns = await GoodsReceiptModel.find({ poId })
            .sort({ receivedAt: -1 })
            .populate('receivedBy', 'firstName lastName');
          return grns;
        }
      } catch (e) {}
    }

    return memoryGRNs.filter((g) => g.poId?.toString() === poId);
  }
}
