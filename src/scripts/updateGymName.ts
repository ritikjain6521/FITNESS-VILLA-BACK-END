import 'dotenv/config';
import mongoose from 'mongoose';
import GymSettings from '../models/GymSettings.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  await GymSettings.updateMany({}, {
    gymName: 'Fitness Villa',
    tagline: 'Luxury Strength & Performance Club',
    email: 'info@fitnessvilla.com',
    website: 'https://fitnessvilla.com',
    receiptPrefix: 'FV',
    memberIdPrefix: 'FV',
  });
  console.log('✅ Gym settings updated to FITNESS VILLA in MongoDB');
  await mongoose.disconnect();
}

run().catch(console.error);
