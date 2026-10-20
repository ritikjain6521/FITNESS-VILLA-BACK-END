import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkInAt: { type: Date, required: true, default: Date.now },
  checkOutAt: { type: Date },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
schema.index({ member: 1, checkInAt: 1 });
export default mongoose.model('Attendance', schema);
