import nodemailer from 'nodemailer';
import GymSettings from '../models/GymSettings.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import NotificationLog from '../models/NotificationLog.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';

// Default templates seed if not present
const DEFAULT_TEMPLATES = [
  {
    key: 'renewal_7d',
    label: 'Membership Expiring in 7 Days',
    whatsappBody: 'Hi {memberName}! 💪\nYour membership for {planName} at {gymName} will expire in {daysLeft} days (on {expiryDate}). Renew today to keep your streak going! 🔥\nContact: {gymPhone}',
    emailSubject: 'Reminder: Your {gymName} membership expires in 7 days',
    emailBody: '<p>Hi <strong>{memberName}</strong>,</p><p>Your membership for <strong>{planName}</strong> at <strong>{gymName}</strong> will expire in 7 days on <strong>{expiryDate}</strong>.</p><p>Please renew your membership at the front desk or contact us at {gymPhone}.</p><p>Keep pushing! 💪</p>',
  },
  {
    key: 'renewal_3d',
    label: 'Membership Expiring in 3 Days',
    whatsappBody: 'Hi {memberName}! ⚠️\nOnly {daysLeft} days left on your {planName} membership at {gymName} (Expires {expiryDate}). Renew now to maintain uninterrupted gym access! 🏋️\nContact: {gymPhone}',
    emailSubject: 'Urgent: Your {gymName} membership expires in 3 days!',
    emailBody: '<p>Hi <strong>{memberName}</strong>,</p><p>This is a quick reminder that only 3 days remain on your <strong>{planName}</strong> membership at <strong>{gymName}</strong> (expires {expiryDate}).</p><p>Renew now at the reception to avoid gym access suspension.</p><p>Best regards,<br/>{gymName} Team</p>',
  },
  {
    key: 'renewal_0d',
    label: 'Membership Expiring Today / Expired',
    whatsappBody: 'Hi {memberName}! 🛑\nYour membership for {planName} at {gymName} has expired today ({expiryDate}). Please renew today at the front desk to continue training without pause! 💪\nContact: {gymPhone}',
    emailSubject: 'Notice: Your {gymName} membership has expired today',
    emailBody: '<p>Hi <strong>{memberName}</strong>,</p><p>Your <strong>{planName}</strong> membership at <strong>{gymName}</strong> has expired on <strong>{expiryDate}</strong>.</p><p>Please visit the front desk today to renew and continue your training.</p>',
  },
  {
    key: 'payment_received',
    label: 'Payment Receipt Confirmation',
    whatsappBody: '🏋️ *{gymName}* - Payment Receipt\n━━━━━━━━━━━━━━━━━━━━\nReceipt No: *{receiptNumber}*\nMember: {memberName}\nDate: {date}\nPayment Method: {method}\n*Amount Paid: ₹{amount}*\nPlan / Purpose: {purpose}\nStatus: *Confirmed & Paid* ✅\n━━━━━━━━━━━━━━━━━━━━\nThank you for training with us! 💪\nPhone: {gymPhone}',
    emailSubject: 'Payment Receipt: {receiptNumber} - {gymName}',
    emailBody: '<div style="font-family:sans-serif;padding:20px;border:1px solid #ddd;border-radius:8px;max-width:500px;"><h2 style="color:#22c55e;">{gymName}</h2><p>Payment Receipt <strong>#{receiptNumber}</strong></p><hr/><p><strong>Member:</strong> {memberName}</p><p><strong>Amount Paid:</strong> ₹{amount}</p><p><strong>Method:</strong> {method}</p><p><strong>Date:</strong> {date}</p><p><strong>Purpose:</strong> {purpose}</p><p style="color:#22c55e;font-weight:bold;">Status: Paid & Verified ✅</p><hr/><p>Thank you for your payment!</p></div>',
  },
  {
    key: 'payment_due',
    label: 'Outstanding Payment Due Reminder',
    whatsappBody: 'Hi {memberName}! 💳\nFriendly reminder from *{gymName}*: You have an outstanding membership balance of *₹{dueAmount}*. Please clear this due at your earliest convenience.\nContact: {gymPhone}',
    emailSubject: 'Payment Due Reminder - {gymName}',
    emailBody: '<p>Hi <strong>{memberName}</strong>,</p><p>This is a polite reminder that you have an outstanding balance of <strong>₹{dueAmount}</strong> for your membership at <strong>{gymName}</strong>.</p><p>Please clear your balance at the gym reception.</p>',
  }
];

export async function ensureDefaultTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await NotificationTemplate.findOne({ key: t.key });
    if (!exists) {
      await NotificationTemplate.create(t);
    }
  }
}

export function cleanPhone(phone?: string): string {
  if (!phone) return '';
  let p = phone.replace(/[^0-9]/g, '');
  if (p.length === 10) p = '91' + p; // default India prefix if 10 digits
  return p;
}

export function formatWhatsAppUrl(phone: string, text: string): string {
  const cPhone = cleanPhone(phone);
  return `https://wa.me/${cPhone}?text=${encodeURIComponent(text)}`;
}

export async function createNodemailerTransporter() {
  const settings = await GymSettings.findOne();
  if (settings?.smtpHost && settings.smtpUser) {
    return nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  // Fallback to test/console transport if SMTP not explicitly configured
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true,
  });
}

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{${k}}`, v || '');
  }
  return result;
}

export async function sendEmailDirect({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const settings = await GymSettings.findOne();
  const from = settings?.smtpFrom || settings?.email || 'noreply@ironpulse.fit';
  const transporter = await createNodemailerTransporter();
  const info = await transporter.sendMail({
    from: `"${settings?.gymName || 'Fitness Villa'}" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
  return info;
}

// Format receipt WhatsApp message and URL
export function generatePaymentReceiptWhatsApp(
  payment: any,
  member: any,
  gymSettings: any
): { text: string; url: string } {
  const gymName = gymSettings?.gymName || 'Fitness Villa';
  const gymPhone = gymSettings?.phone || gymSettings?.whatsapp || '';
  const receiptNo = payment.receiptNumber || `RCP-${payment._id.toString().slice(-6).toUpperCase()}`;
  const amount = (payment.amountPaise / 100).toLocaleString('en-IN');
  const date = payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : new Date().toLocaleDateString('en-IN');
  const purpose = payment.membership?.plan?.name ? `Membership: ${payment.membership.plan.name}` : (payment.notes || 'Gym Membership / Fees');
  const method = (payment.method || 'cash').toUpperCase();

  const text = `🏋️ *${gymName}* - Official Payment Receipt\n━━━━━━━━━━━━━━━━━━━━\n📄 *Receipt No:* ${receiptNo}\n👤 *Member:* ${member?.name || 'Valued Member'}\n📅 *Date:* ${date}\n💳 *Method:* ${method}\n💰 *Amount Paid:* ₹${amount}\n📌 *Particulars:* ${purpose}\n✅ *Status:* Paid & Verified\n━━━━━━━━━━━━━━━━━━━━\nThank you for choosing ${gymName}! Keep training hard! 💪\n📞 Contact: ${gymPhone}`;

  return {
    text,
    url: formatWhatsAppUrl(member?.phone || '', text),
  };
}

// Format POS Sale Receipt WhatsApp
export function generateSaleReceiptWhatsApp(
  sale: any,
  member: any,
  gymSettings: any
): { text: string; url: string } {
  const gymName = gymSettings?.gymName || 'Fitness Villa';
  const gymPhone = gymSettings?.phone || gymSettings?.whatsapp || '';
  const saleNo = sale.saleNumber;
  const total = (sale.totalPaise / 100).toLocaleString('en-IN');
  const date = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const itemsList = (sale.items || []).map((it: any) => `• ${it.productName} (x${it.qty}) - ₹${(it.totalPaise / 100).toLocaleString('en-IN')}`).join('\n');

  const text = `🛒 *${gymName}* - Store Receipt\n━━━━━━━━━━━━━━━━━━━━\n🧾 *Invoice:* ${saleNo}\n👤 *Customer:* ${member?.name || 'Walk-in Customer'}\n📅 *Date:* ${date}\n💳 *Payment:* ${(sale.paymentMethod || 'cash').toUpperCase()}\n\n*Items Purchased:*\n${itemsList}\n━━━━━━━━━━━━━━━━━━━━\n💵 *Total Amount:* ₹${total}\n✅ *Payment Confirmed*\n━━━━━━━━━━━━━━━━━━━━\nThank you for your purchase! Stay fit! 🔥\n📞 ${gymPhone}`;

  return {
    text,
    url: formatWhatsAppUrl(member?.phone || '', text),
  };
}

// Scan memberships and trigger automated email and WhatsApp queue
export async function runAutomatedExpiryScan(triggeredByUserId?: string) {
  await ensureDefaultTemplates();
  const settings = await GymSettings.findOne();
  const gymName = settings?.gymName || 'Fitness Villa';
  const gymPhone = settings?.phone || settings?.whatsapp || '';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find all active memberships
  const memberships = await Membership.find({ status: 'active' })
    .populate('member')
    .populate('plan');

  const results = {
    scanned: memberships.length,
    remindersSent: 0,
    emailsSent: 0,
    whatsappQueued: 0,
    members: [] as any[],
  };

  for (const m of memberships) {
    const member: any = m.member;
    const plan: any = m.plan;
    if (!member || !plan) continue;

    const endDate = new Date(m.endDate);
    const diffTime = endDate.getTime() - todayStart.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let templateKey = '';
    if (daysRemaining === 7) templateKey = 'renewal_7d';
    else if (daysRemaining === 3) templateKey = 'renewal_3d';
    else if (daysRemaining <= 0) templateKey = 'renewal_0d';

    if (!templateKey) continue;

    // Check idempotency: have we sent this reminder in the last 20 hours?
    const idempotencyKey = `expiry_${m._id}_${templateKey}_${todayStart.toISOString().split('T')[0]}`;
    const alreadyLogged = await NotificationLog.findOne({ idempotencyKey });
    if (alreadyLogged) continue;

    const template = await NotificationTemplate.findOne({ key: templateKey, active: true });
    if (!template) continue;

    const expiryStr = endDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    const templateVars = {
      memberName: member.name,
      planName: plan.name,
      gymName,
      gymPhone,
      expiryDate: expiryStr,
      daysLeft: Math.max(0, daysRemaining).toString(),
    };

    const renderedWhatsApp = replaceVars(template.whatsappBody, templateVars);
    const renderedEmailSubject = replaceVars(template.emailSubject, templateVars);
    const renderedEmailBody = replaceVars(template.emailBody, templateVars);

    // Send Email if member has email
    let emailStatus = 'skipped';
    if (member.email) {
      try {
        await sendEmailDirect({
          to: member.email,
          subject: renderedEmailSubject,
          html: renderedEmailBody,
        });
        emailStatus = 'sent';
        results.emailsSent++;
      } catch (err: any) {
        emailStatus = 'failed';
        console.error('Email send error:', err.message);
      }
    }

    // Record WhatsApp in NotificationLog for 1-click dispatch or webhook
    const waLog = await NotificationLog.create({
      member: member._id,
      templateKey,
      channel: 'whatsapp',
      recipient: member.phone || '',
      body: renderedWhatsApp,
      status: member.phone ? 'pending' : 'failed',
      idempotencyKey,
      sentAt: new Date(),
      triggeredBy: triggeredByUserId || null,
      errorDetails: member.phone ? '' : 'No phone number for member',
    });

    results.remindersSent++;
    results.whatsappQueued++;
    results.members.push({
      memberId: member._id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      daysRemaining,
      planName: plan.name,
      expiryDate: expiryStr,
      whatsappUrl: formatWhatsAppUrl(member.phone || '', renderedWhatsApp),
      emailStatus,
      whatsappLogId: waLog._id,
    });
  }

  return results;
}
