import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  type: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment', 'return_in', 'return_out', 'opening'],
    required: true,
    index: true
  },
  qtyChange: { type: Number, required: true }, // positive = in, negative = out
  qtyBefore: { type: Number, required: true },
  qtyAfter: { type: Number, required: true },
  unitCostPaise: { type: Number, default: 0 },  // cost at time of movement
  sourceRef: { type: String, maxlength: 100, default: '' }, // e.g. sale ID, purchase ID
  reason: { type: String, maxlength: 300, default: '' },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now, index: true }
}, { timestamps: true });

schema.index({ product: 1, date: -1 });

export default mongoose.model('StockMovement', schema);
