/**
 * resetPlans.ts
 * Deletes ALL existing plans and re-seeds exactly the 8 plans shown on the
 * Fitness Villa landing page (4 Cardio + Strength tiers, 4 Strength Only tiers).
 *
 * Run:  npx ts-node --esm src/scripts/resetPlans.ts
 *   or: npx tsx src/scripts/resetPlans.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Plan from '../models/Plan.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env');

  console.log('🔌 Connecting to MongoDB…');
  await mongoose.connect(uri);
  console.log('✅ Connected.\n');

  // ── 1. Delete all existing plans ───────────────────────────────────────────
  const { deletedCount } = await Plan.deleteMany({});
  console.log(`🗑️  Deleted ${deletedCount} existing plan(s).\n`);

  // ── 2. Seed the 8 plans exactly as shown on the landing page ───────────────
  const plans = [
    // ── Cardio + Strength ───────────────────────────────────────────────────
    {
      name: 'Cardio + Strength Monthly',
      description: '₹999 + ₹100 admission. Full cardio & strength access.',
      pricePaise: 109900,          // ₹1,099
      durationDays: 30,
      features: [
        'Unlimited Cardio Equipment',
        'Full Strength Zone Access',
        'Locker & Shower Facilities',
        'Trainer Guidance',
      ],
      active: true,
    },
    {
      name: 'Cardio + Strength Quarter',
      description: 'Best short-term value for cardio & strength combo.',
      pricePaise: 270000,          // ₹2,700
      durationDays: 90,
      features: [
        'Unlimited Cardio Equipment',
        'Full Strength Zone Access',
        'Locker & Shower Facilities',
        'Group Classes Included',
      ],
      active: true,
    },
    {
      name: 'Cardio + Strength Half Year',
      description: 'Most popular — 6 months of complete gym access.',
      pricePaise: 480000,          // ₹4,800
      durationDays: 180,
      features: [
        'Unlimited Cardio Equipment',
        'Full Strength Zone Access',
        'Locker & Shower Facilities',
        'Group Classes + Steam Room',
      ],
      active: true,
    },
    {
      name: 'Cardio + Strength Annual',
      description: 'Maximum savings with full year access.',
      pricePaise: 900000,          // ₹9,000
      durationDays: 365,
      features: [
        'Unlimited Cardio Equipment',
        'Full Strength Zone Access',
        'Locker & Shower Facilities',
        'All Classes + Steam + Priority',
      ],
      active: true,
    },

    // ── Only Strength ────────────────────────────────────────────────────────
    {
      name: 'Strength Monthly',
      description: '₹699 + ₹100 admission. Pure strength & iron zone access.',
      pricePaise: 79900,           // ₹799
      durationDays: 30,
      features: [
        'Full Strength Zone Access',
        'Olympic & Selectorized Machines',
        'Locker Facilities',
        'Trainer Guidance',
      ],
      active: true,
    },
    {
      name: 'Strength Quarter',
      description: 'Build solid strength in 3 focused months.',
      pricePaise: 189900,          // ₹1,899
      durationDays: 90,
      features: [
        'Full Strength Zone Access',
        'Olympic & Selectorized Machines',
        'Locker Facilities',
        'Basic Group Access',
      ],
      active: true,
    },
    {
      name: 'Strength Half Year',
      description: 'Most popular — maximum gains, minimum cost.',
      pricePaise: 360000,          // ₹3,600
      durationDays: 180,
      features: [
        'Full Strength Zone Access',
        'Olympic & Selectorized Machines',
        'Locker Facilities',
        'Group Classes Included',
      ],
      active: true,
    },
    {
      name: 'Strength Annual',
      description: 'Full year of raw strength training.',
      pricePaise: 600000,          // ₹6,000
      durationDays: 365,
      features: [
        'Full Strength Zone Access',
        'Olympic & Selectorized Machines',
        'Locker Facilities',
        'All Strength Classes + Priority',
      ],
      active: true,
    },
  ];

  const created = await Plan.insertMany(plans);
  console.log(`✅ Created ${created.length} plans:\n`);
  for (const p of created) {
    const price = `₹${(p.pricePaise / 100).toLocaleString('en-IN')}`;
    console.log(`   • ${p.name.padEnd(35)} ${price.padStart(10)}  /  ${p.durationDays} days`);
  }

  console.log('\n🎉 Plans reset complete!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
