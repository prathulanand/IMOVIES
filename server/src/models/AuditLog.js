import mongoose from 'mongoose';
import { AUDIT_ENTITIES } from '../constants/enums.js';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      enum: Object.values(AUDIT_ENTITIES),
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ entity: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
