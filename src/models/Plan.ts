import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, maxlength: 500, default: '' },
  pricePaise: { type: Number, required: true, min: 0 },
  durationDays: { type: Number, required: true, min: 1, max: 730 },
  features: [{ type: String, maxlength: 120 }],
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Plan', schema);
