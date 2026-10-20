import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  templateKey: { type: String, required: true, maxlength: 50 },
  channel: { type: String, enum: ['sms', 'email', 'whatsapp'], required: true },
  recipient: { type: String, required: true, maxlength: 254 }, // phone or email
  body: { type: String, required: true, maxlength: 3000 }, // rendered message
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'failed'], default: 'pending', index: true },
  providerRef: { type: String, maxlength: 200, default: '' },
  errorDetails: { type: String, maxlength: 1000, default: '' },
  idempotencyKey: { type: String, unique: true, sparse: true, maxlength: 200 },
  scheduledFor: { type: Date, index: true },
  sentAt: { type: Date },
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null } // null = scheduler
}, { timestamps: true });

schema.index({ member: 1, templateKey: 1, createdAt: -1 });

export default mongoose.model('NotificationLog', schema);
