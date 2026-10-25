import mongoose, { Schema } from 'mongoose';

const saleItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true, maxlength: 150 }, // snapshot
  qty: { type: Number, required: true, min: 1 },
  unitPricePaise: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmountPaise: { type: Number, default: 0 },
  totalPaise: { type: Number, required: true, min: 0 }
}, { _id: false });

const schema = new Schema({
  saleNumber: { type: String, required: true, unique: true, index: true },
  member: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // optional — could be walk-in
  items: { type: [saleItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
  subtotalPaise: { type: Number, required: true },
  taxAmountPaise: { type: Number, default: 0 },
  discountPaise: { type: Number, default: 0 },
  totalPaise: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'other'], default: 'cash' },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, maxlength: 300, default: '' },
  isVoid: { type: Boolean, default: false }
}, { timestamps: true });

schema.index({ createdAt: -1 });

export default mongoose.model('Sale', schema);
