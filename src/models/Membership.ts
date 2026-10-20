import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['active','expired','cancelled','pending'], default: 'active', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
schema.index({ member: 1, status: 1 });
export default mongoose.model('Membership', schema);
