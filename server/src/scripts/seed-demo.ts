import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.config.js';
import { ProductModel } from '../models/product.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import { REALISTIC_PRODUCTS } from './seed-database.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const SEED_FILE = path.resolve(DATA_DIR, 'seed-data.json');

const CUSTOMERS = [
  'Apex Robotics India Ltd',
  'Zenith IoT Systems Bangalore',
  'Bharat Embedded Labs Pune',
  'Volt Dynamics Hyderabad',
  'Tata Auto-Electronics Partner',
  'RoboSpark Innovations Delhi',
  'NeoCircuit Technologies Chennai',
  'Kavach Defense Subsystems',
  'Quantix Automation Hub',
  'GreenVolt Smart Meters'
];

export const seedDemoSales = async () => {
  console.log('🚀 Seeding 90 days of realistic demo sales (isDemo: true, stockAdjusted: false)...');

  const now = new Date();
  const demoSales: any[] = [];

  // Excluded product with ZERO sales:
  const ZERO_SALES_SKU = 'PASS-IND-100UH';

  // Products with special profiles:
  // 1. Trending UP product: SBC-RPI4-4GB
  // 2. Trending DOWN product: MCU-ATM328P-PU
  // 3. High-velocity product: MCU-STM32-401
  // 4. Discounted near-cost sales: MCU-RP2040-DC & WIFI-ESP32-32D

  // Generate sales for 90 days (day 90 = 90 days ago, day 0 = today)
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dayProgress = (90 - daysAgo) / 90; // 0 (90 days ago) to 1.0 (today)

    // A. High-Velocity Product: STM32F401RE ('MCU-STM32-401')
    // Sells almost every 1-2 days
    if (daysAgo % 2 === 0 || daysAgo % 3 === 0) {
      const p = REALISTIC_PRODUCTS.find((item) => item.sku === 'MCU-STM32-401')!;
      const qty = Math.floor(Math.random() * 8) + 2;
      demoSales.push({
        sku: p.sku,
        productName: p.name,
        category: p.category,
        quantity: qty,
        unitCost: p.unitCost,
        salePrice: p.sellingPrice,
        customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
        note: 'Direct procurement order',
        date: saleDate,
        isDemo: true,
        stockAdjusted: false
      });
    }

    // B. Trending UP Product: Raspberry Pi 4 ('SBC-RPI4-4GB')
    // Rare 90 days ago (probability ~0.05), very frequent now (probability ~0.65)
    const trendingUpProb = 0.05 + Math.pow(dayProgress, 2) * 0.6;
    if (Math.random() < trendingUpProb) {
      const p = REALISTIC_PRODUCTS.find((item) => item.sku === 'SBC-RPI4-4GB')!;
      const qty = Math.floor(Math.random() * 3) + 1;
      demoSales.push({
        sku: p.sku,
        productName: p.name,
        category: p.category,
        quantity: qty,
        unitCost: p.unitCost,
        salePrice: p.sellingPrice,
        customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
        note: 'Growing demand channel',
        date: saleDate,
        isDemo: true,
        stockAdjusted: false
      });
    }

    // C. Trending DOWN Product: ATmega328P ('MCU-ATM328P-PU')
    // Very frequent 90 days ago (probability ~0.7), rarely bought today (probability ~0.05)
    const trendingDownProb = 0.05 + Math.pow(1 - dayProgress, 2) * 0.65;
    if (Math.random() < trendingDownProb) {
      const p = REALISTIC_PRODUCTS.find((item) => item.sku === 'MCU-ATM328P-PU')!;
      const qty = Math.floor(Math.random() * 15) + 5;
      demoSales.push({
        sku: p.sku,
        productName: p.name,
        category: p.category,
        quantity: qty,
        unitCost: p.unitCost,
        salePrice: p.sellingPrice,
        customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
        note: 'Legacy architecture clearance',
        date: saleDate,
        isDemo: true,
        stockAdjusted: false
      });
    }

    // D. Occasional sales of other products (excluding ZERO_SALES_SKU)
    if (daysAgo % 4 === 0) {
      const eligibleProds = REALISTIC_PRODUCTS.filter(
        (p) =>
          p.sku !== ZERO_SALES_SKU &&
          p.sku !== 'MCU-STM32-401' &&
          p.sku !== 'SBC-RPI4-4GB' &&
          p.sku !== 'MCU-ATM328P-PU'
      );
      const chosenProd = eligibleProds[Math.floor(Math.random() * eligibleProds.length)];
      if (chosenProd) {
        demoSales.push({
          sku: chosenProd.sku,
          productName: chosenProd.name,
          category: chosenProd.category,
          quantity: Math.floor(Math.random() * 5) + 1,
          unitCost: chosenProd.unitCost,
          salePrice: chosenProd.sellingPrice,
          customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
          note: 'Regular catalog purchase',
          date: saleDate,
          isDemo: true,
          stockAdjusted: false
        });
      }
    }
  }

  // E. Specific Discounted Sales Near Cost / Slightly Loss-making
  // 1. RP2040 chip sold near cost (unitCost: 95, normal: 180, salePrice: 98 near cost)
  const rp2040 = REALISTIC_PRODUCTS.find((p) => p.sku === 'MCU-RP2040-DC')!;
  demoSales.push({
    sku: rp2040.sku,
    productName: rp2040.name,
    category: rp2040.category,
    quantity: 120,
    unitCost: rp2040.unitCost,
    salePrice: 98, // near cost (margin ~3%)
    customer: 'Quantix Automation Hub',
    note: 'Bulk institutional contract price (near cost)',
    date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    isDemo: true,
    stockAdjusted: false
  });

  // 2. RP2040 promotional below cost clearance (loss making sale)
  demoSales.push({
    sku: rp2040.sku,
    productName: rp2040.name,
    category: rp2040.category,
    quantity: 50,
    unitCost: rp2040.unitCost,
    salePrice: 90, // below cost (unitCost 95)
    customer: 'GreenVolt Smart Meters',
    note: 'Promo introductory discount (loss-making)',
    date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    isDemo: true,
    stockAdjusted: false
  });

  // 3. ESP32 near cost contract (unitCost: 220, normal: 380, salePrice: 228)
  const esp32 = REALISTIC_PRODUCTS.find((p) => p.sku === 'WIFI-ESP32-32D')!;
  demoSales.push({
    sku: esp32.sku,
    productName: esp32.name,
    category: esp32.category,
    quantity: 80,
    unitCost: esp32.unitCost,
    salePrice: 228, // near cost (margin ~3.5%)
    customer: 'Bharat Embedded Labs Pune',
    note: 'High-volume Tier 1 partner pricing',
    date: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
    isDemo: true,
    stockAdjusted: false
  });

  // Sort sales newest first
  demoSales.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 1. Live MongoDB Seeding (Idempotent: clear previous demo records first)
  let mongoInserted = 0;
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`🍃 Connected to MongoDB at: ${conn.connection.host}`);

    // IDEMPOTENCY: Clear previous demo sales first
    await StockMovementModel.deleteMany({ isDemo: true });

    // Fetch product map from DB
    const dbProducts = await ProductModel.find({}).lean();
    const productMap = new Map<string, any>();
    dbProducts.forEach((p) => {
      productMap.set(p.sku, p);
    });

    const fallbackTenantId = new mongoose.Types.ObjectId('65f123456789012345678901');
    const fallbackUserId = new mongoose.Types.ObjectId('65f987654321098765432109');

    const documentsToInsert = [];
    for (const s of demoSales) {
      const prod = productMap.get(s.sku);
      if (prod) {
        documentsToInsert.push({
          tenantId: prod.tenantId || fallbackTenantId,
          productId: prod._id,
          movementType: 'STOCK_OUT',
          quantity: s.quantity,
          balanceBefore: 100,
          balanceAfter: 100,
          referenceDocType: 'SO',
          referenceDocId: `DEMO-${Math.floor(100000 + Math.random() * 900000)}`,
          reason: 'sale',
          unitCost: s.unitCost,
          salePrice: s.salePrice,
          customer: s.customer,
          note: s.note,
          date: s.date,
          stockAdjusted: false,
          voided: false,
          isDemo: true,
          createdBy: fallbackUserId,
          performedBy: fallbackUserId,
          createdAt: s.date
        });
      }
    }

    if (documentsToInsert.length > 0) {
      const inserted = await StockMovementModel.insertMany(documentsToInsert);
      mongoInserted = inserted.length;
      console.log(`✅ Seeded ${mongoInserted} demo sales into MongoDB!`);
    }
  } catch (err: any) {
    console.warn('⚠️ MongoDB seed skipped / offline:', err.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  // 2. Local JSON Persistence Seeding (Idempotent)
  try {
    if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      const seedData = JSON.parse(raw);

      // Remove existing demo sales
      const preserved = (seedData.sales || []).filter((s: any) => !s.isDemo);

      const formattedDemoSales = demoSales.map((s, idx) => ({
        _id: `demo_sale_${idx + 1}`,
        sku: s.sku,
        productName: s.productName,
        category: s.category,
        movementType: 'STOCK_OUT',
        quantity: s.quantity,
        balanceBefore: 100,
        balanceAfter: 100,
        referenceDocId: `DEMO-${202600 + idx}`,
        reason: 'sale',
        unitCost: s.unitCost,
        salePrice: s.salePrice,
        revenue: Math.round(s.quantity * s.salePrice * 100) / 100,
        profit: Math.round(s.quantity * (s.salePrice - s.unitCost) * 100) / 100,
        customer: s.customer,
        note: s.note,
        date: s.date.toISOString(),
        stockAdjusted: false,
        voided: false,
        isDemo: true,
        createdAt: s.date.toISOString()
      }));

      seedData.sales = [...formattedDemoSales, ...preserved];
      fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
      console.log(`✅ Persisted ${formattedDemoSales.length} demo sales to ${SEED_FILE}`);
    }
  } catch (err: any) {
    console.warn('⚠️ Error updating seed-data.json:', err.message);
  }

  console.log('🎉 Demo sales seeding complete!');
  console.log(`- Total demo sales created: ${demoSales.length}`);
  console.log(`- Span: 90 days with trending up, trending down, and near-cost sales`);
  console.log(`- Product with zero sales preserved: ${ZERO_SALES_SKU}`);
  console.log(`- stockAdjusted: false on all demo records.`);
};

seedDemoSales()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
