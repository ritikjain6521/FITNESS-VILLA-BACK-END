import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
async function main(){
 const {MONGODB_URI,SEED_ADMIN_NAME,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD}=process.env;
 if(!MONGODB_URI||!SEED_ADMIN_NAME||!SEED_ADMIN_EMAIL||!SEED_ADMIN_PASSWORD)throw new Error('Set MONGODB_URI and all SEED_ADMIN_* variables');
 if(SEED_ADMIN_PASSWORD.length<12)throw new Error('Seed admin password must be at least 12 characters');
 await mongoose.connect(MONGODB_URI);
 const email=SEED_ADMIN_EMAIL.toLowerCase();
 const existing=await User.findOne({email});
 if(existing){console.log('Admin email already exists; no changes made.');}
 else {await User.create({name:SEED_ADMIN_NAME,email,role:'admin',passwordHash:await bcrypt.hash(SEED_ADMIN_PASSWORD,12)});console.log('Admin created. Store credentials securely and rotate if needed.');}
 await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
