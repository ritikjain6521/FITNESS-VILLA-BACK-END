import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Membership from '../models/Membership.js';
import Attendance from '../models/Attendance.js';
import Payment from '../models/Payment.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import GymSettings from '../models/GymSettings.js';
import Enquiry from '../models/Enquiry.js';
import Announcement from '../models/Announcement.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB successfully.');

  // 1. Admin & Staff
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe_Immediately_123!';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: process.env.SEED_ADMIN_NAME || 'Gym Administrator',
      email: adminEmail,
      phone: '+91 98765 00001',
      role: 'admin',
      passwordHash,
      active: true,
    });
    console.log(`Created Admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists.`);
  }

  const trainerEmail = 'trainer@example.com';
  let trainer = await User.findOne({ email: trainerEmail });
  if (!trainer) {
    trainer = await User.create({
      name: 'Coach Marcus Vance',
      email: trainerEmail,
      phone: '+91 98765 00002',
      role: 'trainer',
      passwordHash,
      active: true,
    });
    console.log(`Created Trainer user: ${trainerEmail}`);
  }

  // 2. Gym Settings
  let settings = await GymSettings.findOne();
  if (!settings) {
    settings = await GymSettings.create({
      gymName: 'Fitness Villa',
      tagline: 'Luxury Strength & Performance Club',
      address: 'Plot 42, Sector 18, Commercial Hub, New Delhi 110001',
      phone: '+91 98765 43210',
      email: 'info@fitnessvilla.com',
      website: 'https://fitnessvilla.com',
      whatsapp: '919876543210',
      businessHours: 'Mon–Sat: 06:00 AM – 10:30 PM | Sunday: 07:00 AM – 08:00 PM',
      gstEnabled: true,
      gstin: '07AAAAA0000A1Z5',
      defaultTaxRate: 18,
      receiptPrefix: 'FV',
      memberIdPrefix: 'FV',
      instagramUrl: 'https://instagram.com/fitnessvilla_gym',
    });
    console.log('Created default GymSettings');
  }

  // 3. Plans
  const plansData = [
    {
      name: 'Monthly Fitness Pass',
      description: 'Full access to gym floor and state-of-the-art strength zones.',
      pricePaise: 249900,
      durationDays: 30,
      features: ['Unlimited gym floor access', 'Locker & shower facilities', '1 Trainer orientation', 'Mobile check-in pass'],
      active: true,
    },
    {
      name: 'Quarterly Power Pass',
      description: '3 months of structured progression, nutrition guide, and steam bath.',
      pricePaise: 599900,
      durationDays: 90,
      features: ['All Monthly benefits', 'Custom nutrition & macro plan', 'Steam room & recovery access', 'InBody body composition scan'],
      active: true,
    },
    {
      name: 'Annual Iron Elite',
      description: 'Our premier all-inclusive tier with unlimited perks and priority access.',
      pricePaise: 1799900,
      durationDays: 365,
      features: ['Full 365-day 24/7 club access', '4 Personal training sessions', 'Exclusive Fitness Villa apparel kit', '5 Complimentary guest passes', 'Locker reservation'],
      active: true,
    },
  ];

  const planDocs = [];
  for (const p of plansData) {
    let doc = await Plan.findOne({ name: p.name });
    if (!doc) {
      doc = await Plan.create(p);
      console.log(`Created Plan: ${p.name}`);
    }
    planDocs.push(doc);
  }

  // 4. Expense Categories
  const categoryNames = [
    'Rent & Facilities',
    'Electricity & Utilities',
    'Equipment & Maintenance',
    'Trainer & Staff Salaries',
    'Supplements & Stock Purchase',
    'Marketing & Software',
  ];
  const categoryDocs: any = {};
  for (const name of categoryNames) {
    let cat = await ExpenseCategory.findOne({ name });
    if (!cat) {
      cat = await ExpenseCategory.create({ name });
      console.log(`Created Expense Category: ${name}`);
    }
    categoryDocs[name] = cat;
  }

  // 5. Sample Members
  const sampleMembersData = [
    { name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+91 98234 11223' },
    { name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+91 98234 22334' },
    { name: 'Amit Verma', email: 'amit.verma@example.com', phone: '+91 98234 33445' },
    { name: 'Sneha Reddy', email: 'sneha.reddy@example.com', phone: '+91 98234 44556' },
    { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+91 98234 55667' },
    { name: 'Ananya Desai', email: 'ananya.desai@example.com', phone: '+91 98234 66778' },
  ];

  const memberDocs = [];
  for (const m of sampleMembersData) {
    let member = await User.findOne({ email: m.email });
    if (!member) {
      member = await User.create({
        ...m,
        role: 'member',
        passwordHash,
        active: true,
        assignedTrainer: trainer._id,
      });
      console.log(`Created Member: ${m.name}`);
    }
    memberDocs.push(member);
  }

  // 6. Memberships
  const now = new Date();
  // Member 0: Active Annual with 280 days left
  const end0 = new Date(now);
  end0.setDate(end0.getDate() + 280);
  const start0 = new Date(now);
  start0.setDate(start0.getDate() - 85);

  // Member 1: Active Quarterly with 45 days left
  const end1 = new Date(now);
  end1.setDate(end1.getDate() + 45);
  const start1 = new Date(now);
  start1.setDate(start1.getDate() - 45);

  // Member 2: Expiring in 4 days! (Triggers upcoming expiry alert)
  const end2 = new Date(now);
  end2.setDate(end2.getDate() + 4);
  const start2 = new Date(now);
  start2.setDate(start2.getDate() - 26);

  // Member 3: Expiring in 2 days!
  const end3 = new Date(now);
  end3.setDate(end3.getDate() + 2);
  const start3 = new Date(now);
  start3.setDate(start3.getDate() - 28);

  // Member 4: Expired 10 days ago
  const end4 = new Date(now);
  end4.setDate(end4.getDate() - 10);
  const start4 = new Date(now);
  start4.setDate(start4.getDate() - 40);

  const membershipsData = [
    { member: memberDocs[0]._id, plan: planDocs[2]._id, startDate: start0, endDate: end0, status: 'active', createdBy: admin._id },
    { member: memberDocs[1]._id, plan: planDocs[1]._id, startDate: start1, endDate: end1, status: 'active', createdBy: admin._id },
    { member: memberDocs[2]._id, plan: planDocs[0]._id, startDate: start2, endDate: end2, status: 'active', createdBy: admin._id },
    { member: memberDocs[3]._id, plan: planDocs[0]._id, startDate: start3, endDate: end3, status: 'active', createdBy: admin._id },
    { member: memberDocs[4]._id, plan: planDocs[0]._id, startDate: start4, endDate: end4, status: 'expired', createdBy: admin._id },
  ];

  for (const ms of membershipsData) {
    const existing = await Membership.findOne({ member: ms.member, plan: ms.plan });
    if (!existing) {
      await Membership.create(ms);
    }
  }

  // 7. Payments
  const existingPayments = await Payment.countDocuments();
  if (existingPayments === 0) {
    await Payment.create([
      { member: memberDocs[0]._id, amountPaise: 1799900, method: 'upi', status: 'paid', paidAt: start0, recordedBy: admin._id, notes: 'Annual elite package paid via GooglePay' },
      { member: memberDocs[1]._id, amountPaise: 599900, method: 'cash', status: 'paid', paidAt: start1, recordedBy: admin._id, notes: 'Cash receipt #IP-102' },
      { member: memberDocs[2]._id, amountPaise: 249900, method: 'upi', status: 'paid', paidAt: start2, recordedBy: admin._id, notes: 'Monthly pass Paytm' },
      { member: memberDocs[3]._id, amountPaise: 249900, method: 'card', status: 'paid', paidAt: start3, recordedBy: admin._id, notes: 'POS machine card transaction' },
      { member: memberDocs[5]._id, amountPaise: 249900, method: 'upi', status: 'paid', paidAt: now, recordedBy: admin._id, notes: 'Walk-in payment today' },
    ]);
    console.log('Created sample payment records');
  }

  // 8. Attendance (Today & Yesterday)
  const existingAtt = await Attendance.countDocuments();
  if (existingAtt === 0) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000);

    await Attendance.create([
      { member: memberDocs[0]._id, checkInAt: twoHoursAgo, checkOutAt: oneHourAgo, recordedBy: admin._id },
      { member: memberDocs[1]._id, checkInAt: oneHourAgo, checkOutAt: null, recordedBy: admin._id }, // currently in
      { member: memberDocs[2]._id, checkInAt: halfHourAgo, checkOutAt: null, recordedBy: admin._id }, // currently in
      { member: memberDocs[3]._id, checkInAt: twoHoursAgo, checkOutAt: halfHourAgo, recordedBy: admin._id },
    ]);
    console.log('Created sample attendance records');
  }

  // 9. Inventory Products
  const productsData = [
    {
      sku: 'SUP-WHEY-01',
      name: 'Fitness Villa 100% Whey Isolate (Double Chocolate 2kg)',
      category: 'Supplements',
      brand: 'Fitness Villa Nutrition',
      unit: 'jar',
      purchasePricePaise: 340000,
      sellingPricePaise: 499900,
      currentQty: 22,
      reorderThreshold: 5,
      active: true,
    },
    {
      sku: 'SUP-PRE-01',
      name: 'NitroPulse High-Stim Pre-Workout (Blue Razz 300g)',
      category: 'Supplements',
      brand: 'NitroPulse',
      unit: 'tub',
      purchasePricePaise: 95000,
      sellingPricePaise: 169900,
      currentQty: 3, // Low stock!
      reorderThreshold: 8,
      active: true,
    },
    {
      sku: 'SUP-BCAA-01',
      name: 'AminoFuel Intra-Workout BCAA (Watermelon 400g)',
      category: 'Supplements',
      brand: 'AminoFuel',
      unit: 'tub',
      purchasePricePaise: 80000,
      sellingPricePaise: 139900,
      currentQty: 14,
      reorderThreshold: 5,
      active: true,
    },
    {
      sku: 'ACC-SHK-01',
      name: 'Fitness Villa Matte Black Stainless Steel Shaker (750ml)',
      category: 'Accessories',
      brand: 'Fitness Villa',
      unit: 'pc',
      purchasePricePaise: 35000,
      sellingPricePaise: 79900,
      currentQty: 35,
      reorderThreshold: 10,
      active: true,
    },
    {
      sku: 'ACC-STR-01',
      name: 'Heavy-Duty Padded Cotton Lifting Straps',
      category: 'Accessories',
      brand: 'Fitness Villa',
      unit: 'pair',
      purchasePricePaise: 20000,
      sellingPricePaise: 49900,
      currentQty: 4, // Low stock!
      reorderThreshold: 10,
      active: true,
    },
    {
      sku: 'ACC-GLV-01',
      name: 'Pro Ventilated Leather Gym Gloves with Wrist Wrap (L)',
      category: 'Accessories',
      brand: 'Fitness Villa',
      unit: 'pair',
      purchasePricePaise: 42000,
      sellingPricePaise: 89900,
      currentQty: 18,
      reorderThreshold: 6,
      active: true,
    },
  ];

  for (const p of productsData) {
    const existing = await Product.findOne({ sku: p.sku });
    if (!existing) {
      await Product.create(p);
      console.log(`Created Product: ${p.name}`);
    }
  }

  // 10. Expenses
  const existingExpenses = await Expense.countDocuments();
  if (existingExpenses === 0) {
    const rentCat = categoryDocs['Rent & Facilities'];
    const utilCat = categoryDocs['Electricity & Utilities'];
    const maintCat = categoryDocs['Equipment & Maintenance'];
    const salCat = categoryDocs['Trainer & Staff Salaries'];

    await Expense.create([
      { category: rentCat._id, amountPaise: 4500000, vendor: 'DLF Commercial Properties', paymentMethod: 'bank_transfer', notes: 'Monthly gym floor lease', recordedBy: admin._id, date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { category: utilCat._id, amountPaise: 1250000, vendor: 'State Electricity Board', paymentMethod: 'upi', notes: 'AC and power usage for last month', recordedBy: admin._id, date: new Date(now.getFullYear(), now.getMonth(), 5) },
      { category: maintCat._id, amountPaise: 380000, vendor: 'FitTech Services', paymentMethod: 'cash', notes: 'Cable crossover cable replacement and treadmill lubrication', recordedBy: admin._id, date: new Date(now.getFullYear(), now.getMonth(), 10) },
      { category: salCat._id, amountPaise: 2500000, vendor: 'Trainer Marcus Vance', paymentMethod: 'bank_transfer', notes: 'Trainer base stipend', recordedBy: admin._id, date: new Date(now.getFullYear(), now.getMonth(), 7) },
    ]);
    console.log('Created sample expenses');
  }

  // 11. Enquiries
  const existingEnquiries = await Enquiry.countDocuments();
  if (existingEnquiries === 0) {
    await Enquiry.create([
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.k@example.com',
        phone: '+91 99112 33445',
        message: 'Looking for personal training focused on fat loss and strength conditioning. Morning 7am slot preferred.',
        interest: 'personal_training',
        consentGiven: true,
        status: 'new',
      },
      {
        name: 'Meera Nair',
        email: 'meera.nair@example.com',
        phone: '+91 99112 55667',
        message: 'Interested in the Annual Iron Elite membership. Wanted to know about parking availability and locker facilities.',
        interest: 'membership',
        consentGiven: true,
        status: 'contacted',
      },
      {
        name: 'Karan Malhotra',
        email: 'karan.m@example.com',
        phone: '+91 99112 77889',
        message: 'Can I book a complimentary trial workout session this coming Saturday morning?',
        interest: 'free_trial',
        consentGiven: true,
        status: 'converted',
      },
    ]);
    console.log('Created sample enquiries');
  }

  // 10. Sample Announcements & Member Offers
  const existingAnnouncements = await Announcement.countDocuments();
  if (existingAnnouncements === 0) {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    await Announcement.create([
      {
        title: 'Festival Special: 20% Off on Annual Plan Renewals',
        content: 'Renew your membership early or upgrade to the Annual Iron Elite plan this month and enjoy a flat 20% discount plus 2 complimentary personal training sessions!',
        type: 'offer',
        priority: 'high',
        badge: '20% OFF',
        discountPercent: 20,
        validUntil: nextMonth,
        isActive: true,
        createdBy: admin._id,
      },
      {
        title: 'New HYROX & Functional Performance Zone Open',
        content: 'We have upgraded our turf area with sled tracks, skiergs, rogue kettlebells, and plyo platforms. Free functional strength orientation every Saturday at 10 AM.',
        type: 'announcement',
        priority: 'normal',
        badge: 'NEW FACILITY',
        isActive: true,
        createdBy: admin._id,
      },
      {
        title: 'Mobility & Recovery Workshop with Coach Marcus',
        content: 'Join our certified strength coaches this Sunday at 11 AM for an exclusive myofascial release, hip mobility, and sauna recovery masterclass.',
        type: 'event',
        priority: 'normal',
        badge: 'WORKSHOP',
        validUntil: nextMonth,
        isActive: true,
        createdBy: admin._id,
      },
    ]);
    console.log('Created sample announcements & offers');
  }

  console.log('✅ Seeding completed successfully!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
