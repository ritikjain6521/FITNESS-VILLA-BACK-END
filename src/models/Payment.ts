import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  membership: { type: Schema.Types.ObjectId, ref: 'Membership' },
  amountPaise: { type: Number, required: true, min: 1 },
  method: { type: String, enum: ['cash','upi','card','razorpay','bank_transfer'], required: true },
  status: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending', index: true },
  providerOrderId: { type: String, sparse: true, unique: true },
  providerPaymentId: { type: String, sparse: true, unique: true },
  receiptNumber: { type: String, sparse: true, unique: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, maxlength: 300, default: '' },
  paidAt: { type: Date }
}, { timestamps: true });
export default mongoose.model('Payment', schema);
