import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { initCronJobs } from './services/cronService.js';

const port = Number(process.env.PORT || 5000);
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  initCronJobs();
  app.listen(port, () => console.log(`Fitness Villa API listening on ${port}`));
}
start().catch((err) => { console.error('Startup failed', err); process.exit(1); });
