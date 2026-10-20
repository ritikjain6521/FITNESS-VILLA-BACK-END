# Fitness Villa — Backend API

Production-ready backend API service for **Fitness Villa** (Elite Strength & Performance Club).

## 🚀 Tech Stack
- **Runtime & Language**: Node.js & TypeScript
- **Framework**: Express.js
- **Database & ODM**: MongoDB & Mongoose
- **Authentication**: JWT (JSON Web Tokens) with role-based authorization (Admin, Staff, Trainer, Member) & Bcrypt password hashing
- **Security**: Helmet, CORS, Express-Rate-Limit
- **Validation**: Zod schema validation
- **Integrations**: Razorpay (order creation & signature verification), Nodemailer (automated expiry notifications via node-cron)
- **File & Data Export**: Multer & XLSX (Excel export)

---

## 📁 Architecture & Key Modules

- **Auth & Permissions** (`src/routes/auth.ts`, `src/middleware/auth.ts`):
  Role-based authorization for admin, staff, trainer, and member.
- **Member Management** (`src/routes/members.ts`):
  Member CRUD, status tracking, emergency contacts, profile queries.
- **Plans & Memberships** (`src/routes/plans.ts`, `src/routes/memberships.ts`):
  Gym plans, subscription active/expiry management, renewals.
- **Attendance** (`src/routes/attendance.ts`):
  Check-in/check-out tracking, daily attendance history.
- **Payments & Billing** (`src/routes/payments.ts`):
  Manual cash/card receipts and Razorpay online checkout integration.
- **Workouts** (`src/routes/workouts.ts`):
  Trainer-assigned workout routines and member exercise tracking.
- **Inventory & Expenses** (`src/routes/inventory.ts`, `src/routes/expenses.ts`):
  Gym supplements/apparel inventory, stock movements, operational expense logs.
- **Enquiries** (`src/routes/enquiries.ts`):
  Lead capture from landing page, follow-ups, conversion status.
- **Reports & Dashboard Analytics** (`src/routes/reports.ts`, `src/routes/dashboard.ts`):
  Revenue metrics, active members, attendance breakdown, expiring plans.
- **Automated Tasks** (`src/services/cronService.ts`):
  Daily cron notification runner for expiring memberships.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v20+ recommended)
- npm or yarn
- MongoDB Atlas or local MongoDB instance

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=your_super_secret_key_at_least_32_chars
JWT_ACCESS_TTL=15m

SEED_ADMIN_NAME=Fitness Villa Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=YourSecurePassword123!

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Initial Administrator
```bash
npm run seed:admin
```

### 5. Run Development Server
```bash
npm run dev
```
API runs at `http://localhost:5000/api/v1`.
Health check available at `http://localhost:5000/health`.

### 6. Build & Production Run
```bash
npm run build
npm start
```
