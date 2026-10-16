import mongoose from 'mongoose';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.config.js';
import { StockMovementModel } from '../models/stock-movement.model.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const SEED_FILE = path.resolve(DATA_DIR, 'seed-data.json');

export const clearDemoData = async () => {
  console.log('🧹 Clearing demo sales data (isDemo: true)...');

  let deletedCount = 0;

  // 1. Clear from live MongoDB
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`🍃 Connected to MongoDB at: ${conn.connection.host}`);
    const res = await StockMovementModel.deleteMany({ isDemo: true });
    deletedCount += res.deletedCount || 0;
    console.log(`✅ Deleted ${res.deletedCount || 0} demo sale records from MongoDB`);
  } catch (err: any) {
    console.warn('⚠️ MongoDB connection bypassed / unavailable:', err.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  // 2. Clear from local persistent seed file
  try {
    if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      const seedData = JSON.parse(raw);
      if (seedData.sales) {
        const initialCount = seedData.sales.length;
        seedData.sales = seedData.sales.filter((s: any) => !s.isDemo);
        const removed = initialCount - seedData.sales.length;
        deletedCount += removed;
        fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
        console.log(`✅ Removed ${removed} demo sale records from ${SEED_FILE}`);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Error updating seed-data.json:', err.message);
  }

  console.log(`🎉 Demo data cleanup complete! Total demo records deleted: ${deletedCount}`);
};

clearDemoData()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
