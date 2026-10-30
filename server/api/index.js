import app from '../src/app.js';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { cleanupExpiredHolds } from '../src/jobs/expireHolds.js';

let isConnected = false;

async function ensureDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    family: 4,
  });
  isConnected = true;
}

export default async function handler(req, res) {
  try {
    await ensureDatabase();
    try {
      await cleanupExpiredHolds();
    } catch (cleanupErr) {
      console.warn('[SERVERLESS CLEANUP WARN]', cleanupErr.message);
    }
  } catch (err) {
    console.error('[VERCEL SERVERLESS ERROR] MongoDB connection failure:', err.message);
    return res.status(500).json({ error: 'Database connection failed', details: err.message });
  }
  return app(req, res);
}
