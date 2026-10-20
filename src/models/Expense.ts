import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  category: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true, index: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  amountPaise: { type: Number, required: true, min: 1 },
  vendor: { type: String, trim: true, maxlength: 150, default: '' },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'], default: 'cash' },
  referenceNumber: { type: String, maxlength: 100, default: '' },
  notes: { type: String, maxlength: 500, default: '' },
  attachment: { type: String, default: '' }, // file URL
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isVoid: { type: Boolean, default: false }
}, { timestamps: true });

schema.index({ date: -1, category: 1 });

export default mongoose.model('Expense', schema);
