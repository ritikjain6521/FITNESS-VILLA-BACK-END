import mongoose, { Schema } from 'mongoose';

export type AnnouncementType = 'announcement' | 'offer' | 'event' | 'alert';

const schema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  type: {
    type: String,
    enum: ['announcement', 'offer', 'event', 'alert'],
    default: 'announcement',
    index: true,
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal',
  },
  badge: { type: String, trim: true, maxlength: 40, default: '' }, // e.g. "50% OFF", "New Batch", "Holiday Notice"
  discountPercent: { type: Number, min: 0, max: 100, default: 0 },
  validUntil: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ isActive: 1, validUntil: 1 });

export default mongoose.model('Announcement', schema);
