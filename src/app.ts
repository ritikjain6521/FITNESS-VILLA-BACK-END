import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import planRoutes from './routes/plans.js';
import membershipRoutes from './routes/memberships.js';
import attendanceRoutes from './routes/attendance.js';
import workoutRoutes from './routes/workouts.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import expenseRoutes from './routes/expenses.js';
import inventoryRoutes from './routes/inventory.js';
import enquiryRoutes from './routes/enquiries.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';
import { notFound, errorHandler } from './middleware/errors.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ironpulse-api' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/memberships', membershipRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/workouts', workoutRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/backup', backupRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
