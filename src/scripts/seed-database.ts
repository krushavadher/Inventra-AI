import mongoose from 'mongoose';
import dns from 'dns';
import { env } from '../config/env.config.js';

// Fix Node.js Windows SRV lookup issue for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { TenantModel } from '../models/tenant.model.js';
import { UserModel } from '../models/user.model.js';
import { WarehouseModel } from '../models/warehouse.model.js';
import { SupplierModel } from '../models/supplier.model.js';
import { CategoryModel } from '../models/category.model.js';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import { UserRole } from '../enums/user-role.enum.js';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB Atlas for database seeding...');
    await mongoose.connect(env.MONGODB_URI, { family: 4 });
    console.log(`🍃 Connected to MongoDB at: ${mongoose.connection.host}`);

    // Clear existing test collections
    console.log('🧹 Cleaning existing test collections...');
    await TenantModel.deleteMany({});
    await UserModel.deleteMany({});
    await WarehouseModel.deleteMany({});
    await SupplierModel.deleteMany({});
    await CategoryModel.deleteMany({});
    await ProductModel.deleteMany({});
    await InventoryLevelModel.deleteMany({});
    await StockMovementModel.deleteMany({});

    // 1. Seed Tenant
    console.log('🏢 Seeding Tenant...');
    const tenant = await TenantModel.create({
      name: 'Acme Enterprise Supply Chain',
      slug: 'acme-enterprise',
      subscriptionTier: 'ENTERPRISE',
      status: 'ACTIVE'
    });

    // 2. Seed Admin User
    console.log('👤 Seeding Admin User...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminUser = await UserModel.create({
      tenantId: tenant._id,
      email: 'admin@stockmind.ai',
      passwordHash,
      firstName: 'Supply Chain',
      lastName: 'VP',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE'
    });

    // 3. Seed Warehouses
    console.log('🏬 Seeding Warehouses...');
    const whEast = await WarehouseModel.create({
      tenantId: tenant._id,
      code: 'WH-EAST-01',
      name: 'East Coast Main DC',
      type: 'DISTRIBUTION_CENTER',
      status: 'ACTIVE',
      address: { street: '100 Industrial Pkwy', city: 'Boston', state: 'MA', country: 'USA', postalCode: '02108' }
    });

    const whWest = await WarehouseModel.create({
      tenantId: tenant._id,
      code: 'WH-WEST-02',
      name: 'West Coast Hub',
      type: 'DISTRIBUTION_CENTER',
      status: 'ACTIVE',
      address: { street: '500 Logistics Way', city: 'San Jose', state: 'CA', country: 'USA', postalCode: '95110' }
    });

    const whCentral = await WarehouseModel.create({
      tenantId: tenant._id,
      code: 'WH-CTRL-03',
      name: 'Central Logistics DC',
      type: 'REGIONAL_HUB',
      status: 'ACTIVE',
      address: { street: '77 Freight Rd', city: 'Chicago', state: 'IL', country: 'USA', postalCode: '60601' }
    });

    // 4. Seed Suppliers
    console.log('🤝 Seeding Suppliers...');
    const supTech = await SupplierModel.create({
      tenantId: tenant._id,
      code: 'SUP-TECH-01',
      name: 'Tech Components Ltd',
      contact: { primaryName: 'John Davis', email: 'orders@techcomponents.com', phone: '+1-555-0192' },
      status: 'ACTIVE'
    });

    const supSensor = await SupplierModel.create({
      tenantId: tenant._id,
      code: 'SUP-SENS-02',
      name: 'SensorTech',
      contact: { primaryName: 'Sarah Miller', email: 'sales@sensortech.io', phone: '+1-555-0381' },
      status: 'ACTIVE'
    });

    // 5. Seed Categories
    console.log('📦 Seeding Categories...');
    const catMicro = await CategoryModel.create({
      tenantId: tenant._id,
      code: 'CAT-MCU',
      name: 'Microcontrollers',
      slug: 'microcontrollers',
      description: 'Embedded Microcontroller ICs and Development Boards'
    });

    const catSensors = await CategoryModel.create({
      tenantId: tenant._id,
      code: 'CAT-SENS',
      name: 'Sensors',
      slug: 'sensors',
      description: 'Precision Temperature, Motion, and Optical Sensors'
    });

    // 6. Seed Products
    console.log('📦 Seeding Products Master Catalog...');
    const prodMCU = await ProductModel.create({
      tenantId: tenant._id,
      sku: 'MCU-8842-DC',
      name: 'Microcontroller Unit Dual-Core',
      categoryId: catMicro._id,
      barcode: '890123456701',
      qrCode: 'QR-MCU-8842-DC',
      images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150', isPrimary: true }],
      pricing: { unitCost: 1450, sellingPrice: 2200, taxRate: 18 },
      physicalDimensions: { weight: 0.1, weightUom: 'KG', length: 5, width: 5, height: 1, dimensionUom: 'CM' },
      abcClass: 'A',
      status: 'ACTIVE'
    });

    const prodSensor = await ProductModel.create({
      tenantId: tenant._id,
      sku: 'SENS-9941-TH',
      name: 'Thermal Precision Sensor V2',
      categoryId: catSensors._id,
      barcode: '890123456702',
      qrCode: 'QR-SENS-9941-TH',
      images: [{ url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150', isPrimary: true }],
      pricing: { unitCost: 3200, sellingPrice: 4800, taxRate: 18 },
      physicalDimensions: { weight: 0.05, weightUom: 'KG', length: 3, width: 3, height: 1, dimensionUom: 'CM' },
      abcClass: 'A',
      status: 'ACTIVE'
    });

    // 7. Seed Inventory Balances
    console.log('📉 Seeding Inventory Balances...');
    await InventoryLevelModel.create({
      tenantId: tenant._id,
      warehouseId: whEast._id,
      productId: prodMCU._id,
      binCode: 'BIN-A-12',
      batchNumber: 'BATCH-2026-A',
      quantityOnHand: 250,
      quantityCommitted: 45,
      quantityAvailable: 205,
      minSafetyStock: 50,
      reorderPoint: 50,
      status: 'SALABLE'
    });

    await InventoryLevelModel.create({
      tenantId: tenant._id,
      warehouseId: whWest._id,
      productId: prodSensor._id,
      binCode: 'BIN-B-04',
      batchNumber: 'BATCH-2026-B',
      quantityOnHand: 15,
      quantityCommitted: 10,
      quantityAvailable: 5,
      minSafetyStock: 25,
      reorderPoint: 30,
      status: 'SALABLE'
    });

    // 8. Seed Audit Movement Logs
    console.log('📜 Seeding Stock Movement Audit Logs...');
    await StockMovementModel.create({
      tenantId: tenant._id,
      warehouseId: whEast._id,
      productId: prodMCU._id,
      binCode: 'BIN-A-12',
      batchNumber: 'BATCH-2026-A',
      movementType: 'STOCK_IN',
      quantity: 150,
      balanceBefore: 100,
      balanceAfter: 250,
      referenceDocType: 'PO',
      reason: 'Inbound PO Receiving #PO-8821',
      performedBy: adminUser._id
    });

    await StockMovementModel.create({
      tenantId: tenant._id,
      warehouseId: whEast._id,
      productId: prodMCU._id,
      binCode: 'BIN-A-12',
      batchNumber: 'BATCH-2026-A',
      movementType: 'STOCK_OUT',
      quantity: 40,
      balanceBefore: 250,
      balanceAfter: 210,
      referenceDocType: 'SO',
      reason: 'Outbound Customer Sales Order Dispatch #SO-4091',
      performedBy: adminUser._id
    });

    console.log('🎉 REAL MONGODB ATLAS SEEDING COMPLETED SUCCESSFULLY!');
    console.log('✨ All collections (Tenants, Users, Warehouses, Suppliers, Categories, Products, Inventory, Movements) are fully loaded live in your cloud database.');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error Seeding Database:', error);
    process.exit(1);
  }
};

seedDatabase();
