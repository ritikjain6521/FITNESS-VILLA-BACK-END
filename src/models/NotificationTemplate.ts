import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'renewal_7d', 'renewal_3d', 'renewal_0d',
      'payment_due', 'payment_overdue', 'payment_received',
      'welcome', 'custom'
    ]
  },
  label: { type: String, required: true, maxlength: 100 },
  smsBody: { type: String, maxlength: 500, default: '' },
  whatsappBody: { type: String, maxlength: 1500, default: '' },
  emailSubject: { type: String, maxlength: 200, default: '' },
  emailBody: { type: String, maxlength: 3000, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('NotificationTemplate', schema);
