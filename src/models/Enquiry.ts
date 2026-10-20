import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  phone: { type: String, trim: true, maxlength: 25, default: '' },
  message: { type: String, required: true, maxlength: 1000 },
  interest: { type: String, enum: ['membership', 'personal_training', 'free_trial', 'other'], default: 'other' },
  consentGiven: { type: Boolean, required: true },
  status: { type: String, enum: ['new', 'contacted', 'converted', 'closed'], default: 'new', index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String, maxlength: 500, default: '' },
  ip: { type: String, maxlength: 45, default: '' }
}, { timestamps: true });

schema.index({ createdAt: -1 });

export default mongoose.model('Enquiry', schema);
