import mongoose, { Schema } from 'mongoose';
const exercise = new Schema({ name: { type: String, required: true }, sets: { type: Number, min: 1, max: 50, required: true }, reps: { type: String, required: true, maxlength: 30 }, notes: { type: String, maxlength: 300, default: '' } }, { _id: false });
const schema = new Schema({
  member: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  trainer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 100 },
  exercises: { type: [exercise], validate: (v: unknown[]) => v.length > 0 },
  notes: { type: String, maxlength: 1000, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Workout', schema);
