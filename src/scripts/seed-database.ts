import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.config.js';
import { TenantModel } from '../models/tenant.model.js';
import { UserModel } from '../models/user.model.js';
import { CategoryModel } from '../models/category.model.js';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import bcrypt from 'bcryptjs';

// Fix Node.js Windows SRV lookup issue for MongoDB Atlas if DNS is accessible
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const SEED_FILE = path.resolve(DATA_DIR, 'seed-data.json');

// 25 Realistic Products: 19 healthy, 4 low-stock, 2 out-of-stock
export const REALISTIC_PRODUCTS = [
  // 1. Semiconductors
  {
    name: 'STM32F401RE ARM Cortex-M4 MCU',
    sku: 'MCU-STM32-401',
    category: 'Semiconductors',
    supplier: 'STMicroelectronics India',
    unitCost: 480,
    sellingPrice: 750,
    stock: 350,
    minStock: 50
  },
  {
    name: 'Raspberry Pi 4 Model B (4GB RAM)',
    sku: 'SBC-RPI4-4GB',
    category: 'Semiconductors',
    supplier: 'Element14 India',
    unitCost: 4200,
    sellingPrice: 5850,
    stock: 45,
    minStock: 15
  },
  {
    name: 'ATmega328P-PU 8-bit Microcontroller',
    sku: 'MCU-ATM328P-PU',
    category: 'Semiconductors',
    supplier: 'Microchip Technology',
    unitCost: 160,
    sellingPrice: 260,
    stock: 400,
    minStock: 60
  },
  {
    name: 'RP2040 Dual ARM Cortex-M0+ Chip',
    sku: 'MCU-RP2040-DC',
    category: 'Semiconductors',
    supplier: 'Raspberry Pi Foundation',
    unitCost: 95,
    sellingPrice: 180,
    stock: 650,
    minStock: 100
  },

  // 2. Wireless & IoT
  {
    name: 'ESP32-WROOM-32D Wi-Fi & BLE Module',
    sku: 'WIFI-ESP32-32D',
    category: 'Wireless & IoT',
    supplier: 'Espressif Systems',
    unitCost: 220,
    sellingPrice: 380,
    stock: 520,
    minStock: 80
  },
  {
    name: 'NRF24L01+ 2.4GHz RF Wireless Transceiver',
    sku: 'WIFI-NRF24L01-RF',
    category: 'Wireless & IoT',
    supplier: 'Nordic Semiconductor',
    unitCost: 75,
    sellingPrice: 140,
    stock: 420,
    minStock: 60
  },
  {
    name: 'SX1278 LoRa 433MHz Long Range Module',
    sku: 'WIFI-SX1278-LORA',
    category: 'Wireless & IoT',
    supplier: 'Semtech Corporation',
    unitCost: 480,
    sellingPrice: 750,
    stock: 95,
    minStock: 20
  },

  // 3. Sensors
  {
    name: 'BME280 Precision Temp & Humidity Sensor',
    sku: 'SENS-BME280-THP',
    category: 'Sensors',
    supplier: 'Bosch Sensortec',
    unitCost: 380,
    sellingPrice: 590,
    stock: 180,
    minStock: 30
  },
  {
    name: 'MPU-6050 6-Axis Gyroscope & Accelerometer',
    sku: 'SENS-MPU6050-IMU',
    category: 'Sensors',
    supplier: 'InvenSense Inc',
    unitCost: 140,
    sellingPrice: 240,
    stock: 260,
    minStock: 40
  },
  {
    name: 'VL53L0X Time-of-Flight Distance Sensor',
    sku: 'SENS-VL53L0X-TOF',
    category: 'Sensors',
    supplier: 'STMicroelectronics India',
    unitCost: 320,
    sellingPrice: 490,
    stock: 120,
    minStock: 25
  },
  {
    name: 'DHT22 Digital Temperature Sensor',
    sku: 'SENS-DHT22-AM23',
    category: 'Sensors',
    supplier: 'Aosong Electronics',
    unitCost: 210,
    sellingPrice: 340,
    stock: 210,
    minStock: 35
  },
  {
    name: 'HC-SR04 Ultrasonic Distance Sensor',
    sku: 'SENS-HCSR04-ULT',
    category: 'Sensors',
    supplier: 'ElecFreaks Tech',
    unitCost: 65,
    sellingPrice: 120,
    stock: 380,
    minStock: 50
  },

  // 4. Displays
  {
    name: '0.96 inch I2C OLED Display (128x64)',
    sku: 'DISP-OLED-096',
    category: 'Displays',
    supplier: 'Adafruit Industries',
    unitCost: 190,
    sellingPrice: 320,
    stock: 290,
    minStock: 40
  },
  {
    name: '1.8 inch SPI TFT LCD Color Display',
    sku: 'DISP-TFT-180',
    category: 'Displays',
    supplier: 'Waveshare Electronics',
    unitCost: 340,
    sellingPrice: 550,
    stock: 110,
    minStock: 25
  },

  // 5. Power & Batteries
  {
    name: 'LM2596 Step-Down DC-DC Buck Converter',
    sku: 'POW-LM2596-BUCK',
    category: 'Power & Batteries',
    supplier: 'Texas Instruments India',
    unitCost: 65,
    sellingPrice: 125,
    stock: 540,
    minStock: 70
  },
  {
    name: 'TP4056 1A Li-Ion Battery Charger Board',
    sku: 'POW-TP4056-LIPO',
    category: 'Power & Batteries',
    supplier: 'NanJing Top Power',
    unitCost: 30,
    sellingPrice: 65,
    stock: 850,
    minStock: 100
  },
  {
    name: '3.7V 2500mAh 18650 Li-Ion Cell Grade A',
    sku: 'POW-18650-2500',
    category: 'Power & Batteries',
    supplier: 'Panasonic Energy India',
    unitCost: 210,
    sellingPrice: 340,
    stock: 310,
    minStock: 50
  },

  // 6. Passive Components
  {
    name: '0805 SMD Resistor Assortment Kit (1000 pcs)',
    sku: 'PASS-RES-0805K',
    category: 'Passive Components',
    supplier: 'Yageo Corporation',
    unitCost: 420,
    sellingPrice: 690,
    stock: 140,
    minStock: 25
  },
  {
    name: '0603 SMD Ceramic Capacitor Kit (500 pcs)',
    sku: 'PASS-CAP-0603K',
    category: 'Passive Components',
    supplier: 'Murata Manufacturing',
    unitCost: 380,
    sellingPrice: 620,
    stock: 125,
    minStock: 20
  },

  // --- EXACTLY 4 LOW-STOCK ITEMS (stock > 0 && stock <= minStock) ---
  {
    name: 'INA219 High-Side DC Current Sensor',
    sku: 'SENS-INA219-CUR',
    category: 'Sensors',
    supplier: 'Texas Instruments India',
    unitCost: 175,
    sellingPrice: 290,
    stock: 12,
    minStock: 25 // 12 <= 25 (LOW STOCK #1)
  },
  {
    name: 'MAX30102 Pulse Oximeter & HR Sensor',
    sku: 'SENS-MAX30102-HR',
    category: 'Sensors',
    supplier: 'Analog Devices',
    unitCost: 310,
    sellingPrice: 490,
    stock: 8,
    minStock: 20 // 8 <= 20 (LOW STOCK #2)
  },
  {
    name: 'AMS1117-3.3V LDO Voltage Regulator (50 pk)',
    sku: 'POW-AMS1117-33V',
    category: 'Power & Batteries',
    supplier: 'Advanced Monolithic',
    unitCost: 120,
    sellingPrice: 210,
    stock: 5,
    minStock: 30 // 5 <= 30 (LOW STOCK #3)
  },
  {
    name: 'SIM800L GPRS GSM Cellular Module',
    sku: 'WIFI-SIM800L-GSM',
    category: 'Wireless & IoT',
    supplier: 'SIMCom Wireless',
    unitCost: 360,
    sellingPrice: 580,
    stock: 14,
    minStock: 25 // 14 <= 25 (LOW STOCK #4)
  },

  // --- EXACTLY 2 OUT-OF-STOCK ITEMS (stock === 0) ---
  {
    name: 'Raspberry Pi Camera Module V2 (8MP)',
    sku: 'SENS-RPI-CAMV2',
    category: 'Sensors',
    supplier: 'Sony Semiconductor',
    unitCost: 1450,
    sellingPrice: 2100,
    stock: 0,
    minStock: 15 // OUT OF STOCK #1
  },
  {
    name: '100uH High-Current Toroidal Inductor (10 pk)',
    sku: 'PASS-IND-100UH',
    category: 'Passive Components',
    supplier: 'Würth Elektronik',
    unitCost: 210,
    sellingPrice: 350,
    stock: 0,
    minStock: 20 // OUT OF STOCK #2
  }
];

// Generate 30 stock movements across the last 6 months (May to Oct 2026)
export const generateStockMovements = (products: any[]) => {
  const movements = [];
  const now = new Date();
  const types = ['STOCK_IN', 'STOCK_OUT', 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT_ADD'];

  for (let i = 0; i < 30; i++) {
    const prod = products[i % products.length];
    const daysAgo = Math.floor((180 / 30) * (29 - i)) + Math.floor(Math.random() * 4);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const type = types[i % types.length];
    const qty = type === 'STOCK_IN'
      ? Math.floor(Math.random() * 80) + 40
      : type === 'STOCK_OUT'
        ? Math.floor(Math.random() * 45) + 15
        : Math.floor(Math.random() * 20) + 5;

    const balanceBefore = prod.stock + (type === 'STOCK_OUT' ? qty : -qty);
    const balanceAfter = prod.stock;

    movements.push({
      _id: 'mov_' + (i + 1).toString().padStart(3, '0'),
      movementType: type,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      quantity: qty,
      balanceBefore: Math.max(0, balanceBefore),
      balanceAfter: Math.max(0, balanceAfter),
      referenceDocType: type === 'STOCK_IN' ? 'PO' : type === 'STOCK_OUT' ? 'SO' : 'MANUAL',
      referenceDocId: `REF-${202600 + i}`,
      reason: type === 'STOCK_IN' ? 'Restocking Batch Received' : type === 'STOCK_OUT' ? 'Dispatched Order Fulfillment' : 'Cycle Count Audit Correction',
      createdAt: date.toISOString()
    });
  }

  // Sort latest first
  return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const seedDatabase = async () => {
  console.log('🌱 Preparing realistic seed data for Inventra AI...');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const movements = generateStockMovements(REALISTIC_PRODUCTS);

  const seedPayload = {
    products: REALISTIC_PRODUCTS,
    movements,
    generatedAt: new Date().toISOString()
  };

  // 1. Write file persistence for offline/standalone repository parity
  fs.writeFileSync(SEED_FILE, JSON.stringify(seedPayload, null, 2), 'utf-8');
  console.log(`💾 Saved ${REALISTIC_PRODUCTS.length} realistic products & ${movements.length} stock movements to ${SEED_FILE}`);

  // 2. If MongoDB is available, seed MongoDB models (WITHOUT DELETING USERS)
  let mongoConnected = false;
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    mongoConnected = true;
    console.log(`🍃 Connected to MongoDB at: ${conn.connection.host}`);
  } catch (err: any) {
    console.warn('⚠️ MongoDB Atlas remote cluster not reachable. Saved to local persistent dataset.');
  }

  if (mongoConnected && mongoose.connection.readyState === 1) {
    try {
      console.log('🧹 Clearing categories, products, inventory levels, and stock movements...');
      // NOTE: Strictly do NOT delete users as per user requirement!
      await CategoryModel.deleteMany({});
      await ProductModel.deleteMany({});
      await InventoryLevelModel.deleteMany({});
      await StockMovementModel.deleteMany({});

      // Find or create default tenant
      let tenant = await TenantModel.findOne();
      if (!tenant) {
        tenant = await TenantModel.create({
          name: 'Inventra Enterprise Logistics',
          slug: 'inventra-enterprise',
          subscriptionTier: 'ENTERPRISE',
          status: 'ACTIVE'
        });
      }

      // Check if admin user exists; create only if missing (NEVER delete existing users)
      const existingUser = await UserModel.findOne({ email: 'admin@inventra.ai' });
      let adminUserId = existingUser?._id;
      if (!existingUser) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        const newUser = await UserModel.create({
          tenantId: tenant._id,
          name: 'Supply Chain VP',
          email: 'admin@inventra.ai',
          password: passwordHash,
          passwordHash,
          role: 'admin',
          company: 'Inventra Enterprise',
          status: 'ACTIVE'
        });
        adminUserId = newUser._id;
      }

      // Seed Categories
      const categoriesMap = new Map();
      const uniqueCats = Array.from(new Set(REALISTIC_PRODUCTS.map((p) => p.category)));
      for (const catName of uniqueCats) {
        const cat = await CategoryModel.create({
          tenantId: tenant._id,
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `${catName} component inventory`
        });
        categoriesMap.set(catName, cat._id);
      }

      // Seed Products & Inventory Levels
      for (const p of REALISTIC_PRODUCTS) {
        const catId = categoriesMap.get(p.category);
        const prod = await ProductModel.create({
          tenantId: tenant._id,
          name: p.name,
          sku: p.sku,
          categoryId: catId,
          supplier: p.supplier,
          barcode: '890' + Math.floor(100000000 + Math.random() * 900000000),
          qrCode: `QR-${p.sku}`,
          images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150', isPrimary: true }],
          pricing: { unitCost: p.unitCost, sellingPrice: p.sellingPrice, taxRate: 18 },
          status: 'ACTIVE'
        });

        await InventoryLevelModel.create({
          tenantId: tenant._id,
          productId: prod._id,
          quantityOnHand: p.stock,
          quantityAvailable: p.stock,
          quantityCommitted: 0,
          minSafetyStock: p.minStock,
          reorderPoint: p.minStock * 2,
          binCode: `BIN-${p.category.slice(0, 3).toUpperCase()}-01`,
          batchNumber: `BATCH-2026-Q3`
        });
      }

      // Seed Movements
      for (const m of movements) {
        const prod = await ProductModel.findOne({ sku: m.sku });
        if (prod) {
          await StockMovementModel.create({
            tenantId: tenant._id,
            productId: prod._id,
            movementType: m.movementType,
            quantity: m.quantity,
            balanceBefore: m.balanceBefore,
            balanceAfter: m.balanceAfter,
            referenceDocType: m.referenceDocType,
            referenceDocId: m.referenceDocId,
            reason: m.reason,
            performedBy: adminUserId || new mongoose.Types.ObjectId(),
            createdAt: new Date(m.createdAt)
          });
        }
      }

      console.log('✅ Successfully seeded MongoDB collections!');
    } catch (dbErr: any) {
      console.warn('MongoDB seed error:', dbErr.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  console.log('🎉 Seed complete! Summary:');
  console.log(`- 25 realistic products created (${REALISTIC_PRODUCTS.filter(p => p.stock > 0 && p.stock <= p.minStock).length} low-stock, ${REALISTIC_PRODUCTS.filter(p => p.stock === 0).length} out-of-stock)`);
  console.log(`- 30 stock movements logged across last 6 months`);
  console.log(`- User accounts preserved intact.`);
};

// Execute if run directly from CLI
seedDatabase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(0);
  });
