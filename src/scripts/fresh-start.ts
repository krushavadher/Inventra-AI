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
import { PurchaseOrderModel } from '../models/purchase-order.model.js';
import { UserRole } from '../enums/user-role.enum.js';
import bcrypt from 'bcryptjs';

export const freshStart = async () => {
  try {
    console.log('🧹 Connecting to MongoDB Atlas for Fresh Start Reset...');
    await mongoose.connect(env.MONGODB_URI, { family: 4 });
    console.log(`🍃 Connected to MongoDB at: ${mongoose.connection.host}`);

    console.log('🗑️ Wiping all existing collections...');
    await TenantModel.deleteMany({});
    await UserModel.deleteMany({});
    await WarehouseModel.deleteMany({});
    await SupplierModel.deleteMany({});
    await CategoryModel.deleteMany({});
    await ProductModel.deleteMany({});
    await InventoryLevelModel.deleteMany({});
    await StockMovementModel.deleteMany({});
    await PurchaseOrderModel.deleteMany({});

    // Create Initial Clean Tenant & Admin User for login access
    console.log('🏢 Creating clean Organization Tenant & Admin User...');
    const tenant = await TenantModel.create({
      name: 'My Enterprise Store',
      slug: 'my-enterprise',
      subscriptionTier: 'ENTERPRISE',
      status: 'ACTIVE'
    });

    const passwordHash = await bcrypt.hash('admin123', 10);
    await UserModel.create({
      tenantId: tenant._id,
      email: 'admin@stockmind.ai',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE'
    });

    console.log('✨ FRESH START COMPLETE!');
    console.log('🔒 All inventory items, products, warehouses, suppliers, and movement logs have been completely wiped.');
    console.log('👤 Default Admin Login Credentials:');
    console.log('   Email: admin@stockmind.ai');
    console.log('   Password: admin123');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during Fresh Start Reset:', error);
    process.exit(1);
  }
};

freshStart();
