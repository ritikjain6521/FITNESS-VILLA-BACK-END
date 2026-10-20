import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  sku: { type: String, required: true, unique: true, trim: true, maxlength: 50, index: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  category: { type: String, trim: true, maxlength: 80, default: '' },
  brand: { type: String, trim: true, maxlength: 80, default: '' },
  unit: { type: String, trim: true, maxlength: 20, default: 'pc' },
  barcode: { type: String, trim: true, maxlength: 50, default: '' },
  purchasePricePaise: { type: Number, default: 0, min: 0 },
  sellingPricePaise: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 }, // GST %
  currentQty: { type: Number, default: 0, min: 0 },
  reorderThreshold: { type: Number, default: 5, min: 0 },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });

schema.index({ name: 'text', sku: 'text' });

export default mongoose.model('Product', schema);
