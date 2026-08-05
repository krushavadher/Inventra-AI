import mongoose from 'mongoose';
import dns from 'dns';
import { env } from '../config/env.config.js';
import { PurchaseOrderModel } from '../models/purchase-order.model.js';
import { SupplierModel } from '../models/supplier.model.js';
import { WarehouseModel } from '../models/warehouse.model.js';
import { ProductModel } from '../models/product.model.js';

// Fix Node.js Windows SRV DNS resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function seedPurchaseOrders() {
  try {
    console.log(' Connecting to MongoDB Atlas for PO Seed...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('🍃 Connected to MongoDB!');

    console.log('🧹 Clearing existing test POs...');
    await PurchaseOrderModel.deleteMany({});

    let supplier = await SupplierModel.findOne({ isDeleted: false });
    if (!supplier) {
      supplier = await SupplierModel.create({
        tenantId: new mongoose.Types.ObjectId(),
        code: 'SUP-8840',
        name: 'TechComponents Microdevices Inc.',
        taxId: 'TAX-994810',
        contact: { primaryName: 'Robert Vance', email: 'vance@techcomponents.com', phone: '+1 555 019 2831' },
        leadTime: { defaultDays: 5, minDays: 3, maxDays: 7 },
        paymentTerms: 'NET_30',
        performance: { otifScore: 98.4, defectRatePercent: 0.2, totalOrdersCompleted: 142, totalSpendAmount: 23655000, riskLevel: 'LOW' }
      });
    }

    let warehouse = await WarehouseModel.findOne({ isDeleted: false });
    if (!warehouse) {
      warehouse = await WarehouseModel.create({
        tenantId: new mongoose.Types.ObjectId(),
        code: 'WH-EAST-01',
        name: 'East Coast Main Distribution Center',
        type: 'DISTRIBUTION_CENTER',
        totalCapacityVolume: 50000,
        totalCapacityWeight: 100000,
        status: 'ACTIVE'
      });
    }

    let product = await ProductModel.findOne({ isDeleted: false });
    if (!product) {
      product = await ProductModel.create({
        tenantId: new mongoose.Types.ObjectId(),
        sku: 'SKU-8842-MCU',
        name: 'Microcontroller Unit Dual-Core 32-bit',
        categoryId: new mongoose.Types.ObjectId(),
        barcode: '890123456701',
        pricing: { unitCost: 1200, sellingPrice: 1850 }
      });
    }

    const tId = supplier.tenantId || new mongoose.Types.ObjectId();
    const uId = new mongoose.Types.ObjectId();

    console.log('📦 Seeding 6 Purchase Orders across ALL lifecycle statuses...');
    const pos = await PurchaseOrderModel.create([
      {
        tenantId: tId,
        poNumber: 'PO-88401',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'DRAFT',
        lineItems: [{ productId: product._id, orderedQty: 200, receivedQty: 0, unitPrice: 1200, lineTotal: 240000 }],
        totalAmount: 240000,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88402',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'PENDING_APPROVAL',
        lineItems: [{ productId: product._id, orderedQty: 500, receivedQty: 0, unitPrice: 1200, lineTotal: 600000 }],
        totalAmount: 600000,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88403',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'APPROVED',
        lineItems: [{ productId: product._id, orderedQty: 750, receivedQty: 0, unitPrice: 1200, lineTotal: 900000 }],
        totalAmount: 900000,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88404',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'ISSUED',
        lineItems: [{ productId: product._id, orderedQty: 1000, receivedQty: 0, unitPrice: 1200, lineTotal: 1200000 }],
        totalAmount: 1200000,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88405',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'PARTIALLY_RECEIVED',
        lineItems: [{ productId: product._id, orderedQty: 1000, receivedQty: 450, unitPrice: 1200, lineTotal: 1200000 }],
        totalAmount: 1200000,
        paymentStatus: 'PARTIALLY_PAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88406',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'RECEIVED',
        lineItems: [{ productId: product._id, orderedQty: 800, receivedQty: 800, unitPrice: 1200, lineTotal: 960000 }],
        totalAmount: 960000,
        paymentStatus: 'PAID',
        matchStatus: 'MATCHED',
        expectedDeliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdBy: uId
      },
      {
        tenantId: tId,
        poNumber: 'PO-88407',
        supplierId: supplier._id,
        warehouseId: warehouse._id,
        status: 'CANCELLED',
        lineItems: [{ productId: product._id, orderedQty: 250, receivedQty: 0, unitPrice: 1200, lineTotal: 300000 }],
        totalAmount: 300000,
        paymentStatus: 'UNPAID',
        matchStatus: 'PENDING',
        expectedDeliveryDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        createdBy: uId
      }
    ]);

    console.log(`🎉 Successfully seeded ${pos.length} Purchase Orders in MongoDB Atlas!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed PO Error:', err);
    process.exit(1);
  }
}

seedPurchaseOrders();
