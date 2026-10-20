import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorEmail: { type: String, required: true, maxlength: 254 },
  action: { type: String, required: true, maxlength: 100, index: true }, // e.g. 'member.create', 'payment.void'
  targetModel: { type: String, maxlength: 50, default: '' }, // e.g. 'Payment'
  targetId: { type: String, maxlength: 50, default: '' },
  before: { type: Schema.Types.Mixed, default: null }, // snapshot before
  after: { type: Schema.Types.Mixed, default: null }, // snapshot after
  reason: { type: String, maxlength: 500, default: '' },
  ip: { type: String, maxlength: 45, default: '' }
}, { timestamps: true });

schema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', schema);
