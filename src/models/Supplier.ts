import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  contactPerson: { type: String, maxlength: 100, default: '' },
  phone: { type: String, maxlength: 25, default: '' },
  email: { type: String, maxlength: 254, default: '' },
  address: { type: String, maxlength: 400, default: '' },
  gstin: { type: String, maxlength: 20, default: '' },
  notes: { type: String, maxlength: 500, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Supplier', schema);
