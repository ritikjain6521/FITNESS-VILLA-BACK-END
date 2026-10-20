import mongoose, { Schema } from 'mongoose';
export type Role = 'admin' | 'staff' | 'trainer' | 'member';
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 25 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin','staff','trainer','member'], default: 'member', index: true },
  active: { type: Boolean, default: true },
  assignedTrainer: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
export default mongoose.model('User', userSchema);
