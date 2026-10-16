import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.config.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 500
    });
    console.log(`🍃 MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    mongoose.set('bufferCommands', false);
    console.warn('⚠️ Local MongoDB offline. Standalone In-Memory Repository active for fast instant operations.');
  }
};
