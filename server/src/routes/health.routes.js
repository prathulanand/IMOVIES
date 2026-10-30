import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(200).json({
    status: 'UP',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbStatus,
    env: env.NODE_ENV,
  });
});

export default router;
