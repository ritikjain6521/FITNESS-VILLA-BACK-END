import mongoose, { Schema } from 'mongoose';

export type RenewalRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type RenewalRequestType = 'renewal' | 'upgrade';

const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  currentMembership: { type: Schema.Types.ObjectId, ref: 'Membership' },
  requestedPlan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  requestType: {
    type: String,
    enum: ['renewal', 'upgrade'],
    default: 'renewal',
    index: true,
  },
  notes: { type: String, maxlength: 500, default: '' },
  preferredStartDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true,
  },
  adminNotes: { type: String, maxlength: 500, default: '' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

schema.index({ member: 1, status: 1 });

export default mongoose.model('RenewalRequest', schema);
