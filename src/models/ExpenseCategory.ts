import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
  description: { type: String, maxlength: 300, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ExpenseCategory', schema);
