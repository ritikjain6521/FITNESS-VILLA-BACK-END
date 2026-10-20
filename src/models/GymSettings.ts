import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  gymName: { type: String, default: 'IronPulse Fitness Club', maxlength: 100 },
  tagline: { type: String, default: '', maxlength: 200 },
  logo: { type: String, default: '' },
  address: { type: String, default: '', maxlength: 400 },
  phone: { type: String, default: '', maxlength: 25 },
  email: { type: String, default: '', maxlength: 254 },
  website: { type: String, default: '', maxlength: 200 },
  whatsapp: { type: String, default: '', maxlength: 25 },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  businessHours: { type: String, default: 'Mon–Sat: 6am – 10pm, Sun: 7am – 9pm', maxlength: 300 },
  // GST
  gstEnabled: { type: Boolean, default: false },
  gstin: { type: String, default: '', maxlength: 20 },
  defaultTaxRate: { type: Number, default: 0, min: 0, max: 100 }, // percent
  // Receipt
  receiptPrefix: { type: String, default: 'IP', maxlength: 10 },
  receiptCounter: { type: Number, default: 0, min: 0 },
  memberIdPrefix: { type: String, default: 'MBR', maxlength: 10 },
  memberCounter: { type: Number, default: 0, min: 0 },
  // Reminder intervals (days before expiry)
  reminderDaysBefore: { type: [Number], default: [7, 3, 0] },
  overdueReminderDays: { type: [Number], default: [1, 3, 7] },
  quietHoursStart: { type: String, default: '22:00', maxlength: 5 },
  quietHoursEnd: { type: String, default: '08:00', maxlength: 5 },
  // Social / Map
  instagramUrl: { type: String, default: '', maxlength: 200 },
  mapEmbedUrl: { type: String, default: '', maxlength: 500 },
  // Email provider stub
  smtpHost: { type: String, default: '', maxlength: 200 },
  smtpPort: { type: Number, default: 587 },
  smtpUser: { type: String, default: '', maxlength: 200 },
  smtpFrom: { type: String, default: '', maxlength: 254 },
  // SMS provider stub
  smsProvider: { type: String, enum: ['none', 'twilio', 'msg91', 'custom'], default: 'none' },
  smsSenderId: { type: String, default: '', maxlength: 20 },
}, { timestamps: true });

export default mongoose.model('GymSettings', schema);
