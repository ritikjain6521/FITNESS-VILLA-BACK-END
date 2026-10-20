import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  memberId: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  address: { type: String, maxlength: 300, default: '' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  bloodGroup: { type: String, maxlength: 5, default: '' },
  emergencyContact: {
    name: { type: String, maxlength: 100, default: '' },
    phone: { type: String, maxlength: 25, default: '' },
    relation: { type: String, maxlength: 50, default: '' }
  },
  joiningFee: { type: Number, default: 0, min: 0 }, // in paise
  joiningDate: { type: Date, default: Date.now },
  photo: { type: String, default: '' }, // URL/path
  notificationPrefs: {
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false }
  },
  notes: { type: String, maxlength: 1000, default: '' }
}, { timestamps: true });

export default mongoose.model('Member', schema);
