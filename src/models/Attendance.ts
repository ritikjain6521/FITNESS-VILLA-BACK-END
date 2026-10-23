import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkInAt: { type: Date, required: true, default: Date.now },
  checkOutAt: { type: Date },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  photoUrl: { type: String }, // Base64 data URI of the live selfie
  verificationMethod: {
    type: String,
    enum: ['manual', 'kiosk', 'self_photo', 'qr'],
    default: 'manual',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, default: '' },
  location: { type: String, default: 'Fitness Villa Main Floor' },
  deviceInfo: { type: String },
}, { timestamps: true });

schema.index({ member: 1, checkInAt: 1 });
schema.index({ status: 1 });
export default mongoose.model('Attendance', schema);
