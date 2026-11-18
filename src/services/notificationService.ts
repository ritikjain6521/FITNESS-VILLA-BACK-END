import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}
import nodemailer from 'nodemailer';
import GymSettings from '../models/GymSettings.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import NotificationLog from '../models/NotificationLog.js';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';

// Responsive Luxury HTML Email Builder in Hindi
export function buildHindiEmailTemplate({
  gymName,
  gymPhone,
  title,
  subtitle,
  badgeText,
  badgeColor = '#ef4444',
  memberName,
  planName,
  expiryDate,
  daysLeftText,
  statusText,
  callToActionText = 'जिम काउंटर पर संपर्क करें या ऑनलाइन नवीनीकरण कराएं',
}: {
  gymName: string;
  gymPhone: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor?: string;
  memberName: string;
  planName: string;
  expiryDate: string;
  daysLeftText: string;
  statusText: string;
  callToActionText?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#070908;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070908;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:#101512;border:1px solid #233125;border-radius:14px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.7);">
          
          <!-- Header -->
          <tr>
            <td style="padding:28px 24px 20px;text-align:center;background:linear-gradient(180deg,#19231c 0%,#101512 100%);border-bottom:1px solid #233125;">
              <div style="display:inline-block;padding:6px 14px;background:#1a271c;border:1px solid #b5f23d;border-radius:30px;color:#b5f23d;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
                🏋️ FITNESS VILLA GYM
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${gymName}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">${subtitle}</p>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding:24px 24px 10px;text-align:center;">
              <span style="display:inline-block;padding:8px 18px;border-radius:8px;background:${badgeColor}22;border:1px solid ${badgeColor};color:${badgeColor};font-size:14px;font-weight:700;">
                ${badgeText}
              </span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:15px 28px 25px;">
              <p style="font-size:16px;color:#f3f4f6;margin:0 0 16px;">
                नमस्ते <strong style="color:#b5f23d;">${memberName}</strong> जी 🙏,
              </p>
              <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 20px;">
                यह आवश्यक सूचना आपको सूचित करने के लिए भेजी जा रही है कि <strong style="color:#ffffff;">${gymName}</strong> में आपकी जिम सदस्यता का विवरण निम्नलिखित है:
              </p>

              <!-- Details Box -->
              <table role="presentation" width="100%" style="background:#090d0a;border:1px solid #1f2a21;border-radius:10px;margin-bottom:22px;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">सदस्य का नाम (Member Name)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">सदस्यता प्लान (Plan)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#b5f23d;font-size:14px;font-weight:700;text-align:right;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">समाप्ति तिथि (Expiry Date)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${expiryDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:13px;">वर्तमान स्थिति (Status)</td>
                  <td style="padding:12px 16px;color:${badgeColor};font-size:14px;font-weight:700;text-align:right;">${statusText} (${daysLeftText})</td>
                </tr>
              </table>

              <!-- Action Call -->
              <div style="background:#152217;border-left:4px solid #b5f23d;padding:14px 18px;border-radius:4px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#e5e7eb;">
                  👉 <strong>कार्रवाई करें:</strong> ${callToActionText}। समय पर नवीनीकरण कराने से आपकी ट्रेनिंग और फिटनेस में कोई रुकावट नहीं आएगी।
                </p>
              </div>

              <!-- Contact & Help -->
              <p style="font-size:13px;color:#9ca3af;margin:0 0 6px;">
                📞 किसी भी जानकारी या सहायता के लिए हमारे हेल्पलाइन नंबर पर संपर्क करें:
              </p>
              <p style="font-size:16px;font-weight:700;color:#b5f23d;margin:0 0 20px;">
                ${gymPhone || 'जिम रिसेप्शन'}
              </p>

              <hr style="border:none;border-top:1px solid #233125;margin:24px 0 16px;">
              <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
                आपकी सेहत और फिटनेस ही हमारा संकल्प है! 💪🔥<br>
                <strong>टीम ${gymName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;text-align:center;background:#060807;border-top:1px solid #1f2a21;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                यह एक स्वचालित संदेश है। कृपया सदस्यता नवीनीकरण के लिए सीधे जिम रिसेप्शन पर पधारें।
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// 100% Hindi Default Templates
export const DEFAULT_TEMPLATES = [
  {
    key: 'renewal_7d',
    label: 'सदस्यता समाप्ति सूचना (7 दिन शेष)',
    whatsappBody: 'नमस्ते {memberName} जी! 💪\n{gymName} में आपकी {planName} सदस्यता समाप्त होने में {daysLeft} दिन शेष हैं (समाप्ति तिथि: {expiryDate})।\nअपनी फिटनेस यात्रा को बिना रुकावट जारी रखने के लिए कृपया समय रहते सदस्यता का नवीनीकरण (Renew) करवाएं। 🔥\nजिम संपर्क सूत्र: {gymPhone}\nधन्यवाद! - {gymName}',
    emailSubject: 'स्मरण पत्र: {gymName} में आपकी जिम सदस्यता {daysLeft} दिन में समाप्त हो रही है',
    emailBody: '<div style="font-family:Arial,sans-serif;background:#0d120f;color:#fff;padding:24px;border-radius:10px;border:1px solid #2b3b2d;max-width:540px;"><h2 style="color:#b5f23d;margin-top:0;">{gymName}</h2><p>नमस्ते <strong>{memberName}</strong> जी,</p><p>आपकी <strong>{planName}</strong> सदस्यता 7 दिनों बाद (दिनांक: <strong>{expiryDate}</strong>) समाप्त होने वाली है।</p><p>अपनी दैनिक फिटनेस ट्रेनिंग जारी रखने के लिए कृपया समय पर जिम रिसेप्शन पर संपर्क कर नवीनीकरण करवाएं।</p><p style="color:#b5f23d;font-weight:bold;">हेल्पलाइन: {gymPhone}</p><p>धन्यवाद,<br/>टीम {gymName}</p></div>',
  },
  {
    key: 'renewal_3d',
    label: 'अति आवश्यक: सदस्यता समाप्ति सूचना (3 दिन शेष)',
    whatsappBody: 'नमस्ते {memberName} जी! ⚠️\n{gymName} में आपकी {planName} सदस्यता समाप्त होने में केवल {daysLeft} दिन शेष हैं (समाप्ति तिथि: {expiryDate})।\nअबाध जिम प्रवेश बनाए रखने के लिए कृपया आज ही रिसेप्शन पर संपर्क कर नवीनीकरण (Renew) करवाएं। 🏋️‍♂️\nजिम संपर्क सूत्र: {gymPhone}\nधन्यवाद! - {gymName}',
    emailSubject: 'अति आवश्यक: {gymName} में आपकी जिम सदस्यता समाप्त होने में केवल 3 दिन शेष हैं!',
    emailBody: '<div style="font-family:Arial,sans-serif;background:#0d120f;color:#fff;padding:24px;border-radius:10px;border:1px solid #ff9f43;max-width:540px;"><h2 style="color:#ff9f43;margin-top:0;">{gymName} - अति आवश्यक सूचना</h2><p>नमस्ते <strong>{memberName}</strong> जी,</p><p>आपकी <strong>{planName}</strong> सदस्यता समाप्त होने में केवल <strong>3 दिन</strong> शेष हैं (समाप्ति तिथि: <strong>{expiryDate}</strong>)।</p><p>अबाध प्रवेश बनाए रखने हेतु कृपया तुरंत जिम काउंटर पर संपर्क करके अपनी सदस्यता का नवीनीकरण कराएं।</p><p style="color:#b5f23d;font-weight:bold;">हेल्पलाइन: {gymPhone}</p><p>धन्यवाद,<br/>टीम {gymName}</p></div>',
  },
  {
    key: 'renewal_0d',
    label: 'सदस्यता समाप्त / Overdue (आज या पूर्व में समाप्त)',
    whatsappBody: 'नमस्ते {memberName} जी! 🛑\n{gymName} में आपकी {planName} सदस्यता समाप्त हो चुकी है (समाप्ति तिथि: {expiryDate})।\nअपनी फिटनेस ट्रेनिंग जारी रखने के लिए कृपया आज ही रिसेप्शन पर संपर्क कर अपनी सदस्यता का नवीनीकरण (Renew) करवाएं। 💪\nजिम संपर्क सूत्र: {gymPhone}\nधन्यवाद! - {gymName}',
    emailSubject: 'महत्वपूर्ण सूचना: {gymName} में आपकी जिम सदस्यता समाप्त हो चुकी है (Renew Now)',
    emailBody: '<div style="font-family:Arial,sans-serif;background:#0d120f;color:#fff;padding:24px;border-radius:10px;border:1px solid #ff6b6b;max-width:540px;"><h2 style="color:#ff6b6b;margin-top:0;">{gymName} - सदस्यता समाप्ति सूचना</h2><p>नमस्ते <strong>{memberName}</strong> जी,</p><p>आपकी <strong>{planName}</strong> सदस्यता दिनांक <strong>{expiryDate}</strong> को समाप्त हो चुकी है।</p><p>अपनी ट्रेनिंग को बिना किसी रुकावट के जारी रखने के लिए कृपया आज ही जिम काउंटर पर संपर्क कर नवीनीकरण करवाएं।</p><p style="color:#b5f23d;font-weight:bold;">हेल्पलाइन: {gymPhone}</p><p>धन्यवाद,<br/>टीम {gymName}</p></div>',
  },
  {
    key: 'payment_received',
    label: 'भुगतान रसीद (Payment Receipt)',
    whatsappBody: '🏋️ *{gymName}* - आधिकारिक भुगतान रसीद\n━━━━━━━━━━━━━━━━━━━━\n📄 *रसीद सं:* {receiptNumber}\n👤 *सदस्य:* {memberName}\n📅 *दिनांक:* {date}\n💳 *भुगतान माध्यम:* {method}\n💰 *जमा राशि: ₹{amount}*\n📌 *विवरण:* {purpose}\n✅ *स्थिति: भुगतान सफल ও सत्यापित*\n━━━━━━━━━━━━━━━━━━━━\n{gymName} के साथ जुड़ने के लिए धन्यवाद! ऐसे ही मेहनत करते रहें! 💪\n📞 संपर्क: {gymPhone}',
    emailSubject: 'भुगतान रसीद: #{receiptNumber} - {gymName}',
    emailBody: '<div style="font-family:sans-serif;padding:24px;background:#0d120f;color:#fff;border:1px solid #b5f23d;border-radius:10px;max-width:500px;"><h2 style="color:#b5f23d;margin-top:0;">{gymName}</h2><p>आधिकारिक भुगतान रसीद <strong>#{receiptNumber}</strong></p><hr style="border-color:#2b3b2d;"/><p><strong>सदस्य का नाम:</strong> {memberName}</p><p><strong>जमा राशि:</strong> ₹{amount}</p><p><strong>भुगतान माध्यम:</strong> {method}</p><p><strong>दिनांक:</strong> {date}</p><p><strong>विवरण:</strong> {purpose}</p><p style="color:#b5f23d;font-weight:bold;">स्थिति: भुगतान सफल व सत्यापित ✅</p><hr style="border-color:#2b3b2d;"/><p>आपके भुगतान के लिए धन्यवाद!</p></div>',
  },
  {
    key: 'payment_due',
    label: 'बकाया शुल्क स्मरण (Payment Overdue / Due)',
    whatsappBody: 'नमस्ते {memberName} जी! 💳\n{gymName} से विनम्र स्मरण: आपकी सदस्यता का बकाया शुल्क ₹{dueAmount} लंबित है।\nकृपया असुविधा से बचने के लिए जल्द से जल्द अपनी बकाया राशि जमा करवाएं।\nजिम संपर्क सूत्र: {gymPhone}\nधन्यवाद! - {gymName}',
    emailSubject: 'बकाया भुगतान सूचना - {gymName}',
    emailBody: '<div style="font-family:Arial,sans-serif;background:#0d120f;color:#fff;padding:24px;border-radius:10px;border:1px solid #ffd166;max-width:540px;"><h2 style="color:#ffd166;margin-top:0;">{gymName} - बकाया शुल्क सूचना</h2><p>नमस्ते <strong>{memberName}</strong> जी,</p><p>आपकी सदस्यता का <strong>₹{dueAmount}</strong> बकाया शुल्क लंबित है।</p><p>कृपया असुविधा से बचने के लिए जल्द से जल्द जिम रिसेप्शन पर अपनी बकाया राशि जमा करवाएं।</p><p style="color:#b5f23d;font-weight:bold;">हेल्पलाइन: {gymPhone}</p><p>धन्यवाद,<br/>टीम {gymName}</p></div>',
  }
];

// Ensure all default templates in MongoDB are updated to 100% Hindi
export async function ensureDefaultTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    await NotificationTemplate.findOneAndUpdate(
      { key: t.key },
      { $set: t },
      { upsert: true, new: true }
    );
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

// Nodemailer Transporter with Live SMTP support & Gmail App Password detection
export async function createNodemailerTransporter(overrides?: {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}) {
  const settings = await GymSettings.findOne();

  // 1. Check overrides from test/direct request
  const oHost = overrides?.smtpHost;
  const oPort = overrides?.smtpPort;
  const oUser = overrides?.smtpUser;
  const oPass = overrides?.smtpPass;

  // 2. Check process.env SMTP config
  const envHost = process.env.SMTP_HOST;
  const envPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;

  // 3. Check GymSettings in MongoDB
  const dbHost = settings?.smtpHost;
  const dbPort = settings?.smtpPort;
  const dbUser = settings?.smtpUser;
  const dbPass = (settings as any)?.smtpPass;

  const host = (oHost || envHost || dbHost || '').trim();
  const rawPort = oPort || envPort || dbPort;
  const user = (oUser || envUser || dbUser || '').trim();
  const rawPass = oPass || envPass || dbPass || '';
  const cleanPass = rawPass.replace(/\s+/g, '');

  if (host && user && cleanPass) {
    const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().includes('@gmail.com');
    const port = isGmail ? 465 : (rawPort ? Number(rawPort) : 465);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: isGmail ? 'smtp.gmail.com' : host,
      port,
      secure,
      auth: { user, pass: cleanPass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    return {
      transporter,
      isLive: true,
      senderUser: user,
    };
  }

  // Fallback to test/stream transport if no SMTP configured
  return {
    transporter: nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true,
    }),
    isLive: false,
    senderUser: '',
  };
}

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(`{${k}}`, v || '');
  }
  return result;
}

// Send real email direct (Supports Resend HTTP 443 for Render + Nodemailer SMTP for localhost)
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
  const resendApiKey = process.env.RESEND_API_KEY || (settings as any)?.resendApiKey;

  // 1. If Resend API Key is set, send via HTTPS on Port 443 (Bypasses Render SMTP block!)
  if (resendApiKey) {
    const from = process.env.RESEND_FROM || settings?.smtpFrom || 'Fitness Villa <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resData?.message || 'Resend HTTP API error');
    }

    console.log(`[EMAIL SENT VIA RESEND HTTP 443] to ${to} (ID: ${resData.id})`);
    return { info: resData, isLive: true };
  }

  // 2. Otherwise send via Nodemailer SMTP (Port 465)
  const transporterObj = await createNodemailerTransporter();
  const from = process.env.SMTP_FROM || settings?.smtpFrom || transporterObj.senderUser || settings?.email || 'noreply@fitnessvilla.in';
  const gymName = settings?.gymName || 'Fitness Villa';

  const info = await transporterObj.transporter.sendMail({
    from: `"${gymName}" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });

  if (!transporterObj.isLive) {
    console.warn(`[EMAIL NOTICE] Email to ${to} was prepared in test/stream mode. To send live emails to member inboxes, configure SMTP credentials in Settings > Email (SMTP) or server/.env.`);
  } else {
    console.log(`[EMAIL SENT VIA SMTP] Live email successfully sent to ${to} (MessageID: ${info.messageId})`);
  }

  return { info, isLive: transporterObj.isLive };
}

// Test SMTP connection and dispatch verification email
export async function testSmtpConnection(
  targetEmail: string,
  overrides?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    resendApiKey?: string;
  }
) {
  const settings = await GymSettings.findOne();
  const resendApiKey = overrides?.resendApiKey || process.env.RESEND_API_KEY || (settings as any)?.resendApiKey;

  const gymName = settings?.gymName || 'Fitness Villa';
  const testHtml = buildHindiEmailTemplate({
    gymName,
    gymPhone: settings?.phone || settings?.whatsapp || '9876543210',
    title: 'परीक्षण ईमेल (SMTP Test Email)',
    subtitle: 'ईमेल डिलीवरी सत्यापन सफल',
    badgeText: '✅ टेस्ट ईमेल सफल (Test Email Success)',
    badgeColor: '#22c55e',
    memberName: 'व्यवस्थापक (Admin)',
    planName: 'सिस्टम सत्यापन (System Verification)',
    expiryDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    daysLeftText: 'सक्रिय (Active)',
    statusText: 'ईमेल प्रणाली पूरी तरह तैयार है',
    callToActionText: 'आपकी ईमेल प्रणाली सही ढंग से कार्य कर रही है। अब सदस्यों को स्वतः एवं मैनुअल ईमेल सीधे उनके इनबॉक्स में प्राप्त होंगे।',
  });

  // 1. If Resend HTTP is available (for Render Production over Port 443):
  if (resendApiKey) {
    const from = overrides?.smtpFrom || process.env.RESEND_FROM || settings?.smtpFrom || 'Fitness Villa <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject: `[परीक्षण ईमेल] ${gymName} - ईमेल डिलीवरी सत्यापन सफल ✅`,
        html: testHtml,
        text: `नमस्ते! ${gymName} की ईमेल प्रणाली सफलतापूर्वक जुड़ चुकी है और ठीक से काम कर रही है।`,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resData?.message || 'Resend HTTP API error');
    }

    return { success: true, messageId: resData.id, recipient: targetEmail };
  }

  // 2. Otherwise send via Nodemailer SMTP (Port 465)
  const transporterObj = await createNodemailerTransporter(overrides);

  if (!transporterObj.isLive) {
    throw new Error('SMTP सेटिंग्स कॉन्फ़िगर नहीं हैं! कृपया Settings पेज या server/.env में SMTP Host, User और App Password दर्ज करें।');
  }

  // Verify connection
  await transporterObj.transporter.verify();

  const from = overrides?.smtpFrom || process.env.SMTP_FROM || settings?.smtpFrom || transporterObj.senderUser || 'noreply@fitnessvilla.in';
  const info = await transporterObj.transporter.sendMail({
    from: `"${gymName}" <${from}>`,
    to: targetEmail,
    subject: `[परीक्षण ईमेल] ${gymName} - ईमेल डिलीवरी सत्यापन सफल ✅`,
    html: testHtml,
    text: `नमस्ते! ${gymName} की ईमेल प्रणाली सफलतापूर्वक जुड़ चुकी है और ठीक से काम कर रही है।`,
  });

  return { success: true, messageId: info.messageId, recipient: targetEmail };
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
  const purpose = payment.membership?.plan?.name ? `सदस्यता: ${payment.membership.plan.name}` : (payment.notes || 'जिम सदस्यता / शुल्क');
  const method = (payment.method || 'cash').toUpperCase();

  const text = `🏋️ *${gymName}* - आधिकारिक भुगतान रसीद\n━━━━━━━━━━━━━━━━━━━━\n📄 *रसीद सं:* ${receiptNo}\n👤 *सदस्य:* ${member?.name || 'सम्मानित सदस्य'}\n📅 *दिनांक:* ${date}\n💳 *माध्यम:* ${method}\n💰 *जमा राशि:* ₹${amount}\n📌 *विवरण:* ${purpose}\n✅ *स्थिति:* भुगतान सफल व सत्यापित\n━━━━━━━━━━━━━━━━━━━━\n${gymName} को चुनने के लिए धन्यवाद! ऐसे ही मेहनत करते रहें! 💪\n📞 संपर्क: ${gymPhone}`;

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

  const text = `🛒 *${gymName}* - स्टोर रसीद\n━━━━━━━━━━━━━━━━━━━━\n🧾 *बिल सं:* ${saleNo}\n👤 *ग्राहक:* ${member?.name || 'ग्राहक'}\n📅 *दिनांक:* ${date}\n💳 *भुगतान:* ${(sale.paymentMethod || 'cash').toUpperCase()}\n\n*खरीदी गई सामग्री:*\n${itemsList}\n━━━━━━━━━━━━━━━━━━━━\n💵 *कुल राशि:* ₹${total}\n✅ *भुगतान प्राप्त हुआ*\n━━━━━━━━━━━━━━━━━━━━\nखरीदारी के लिए धन्यवाद! फिट रहें, स्वस्थ रहें! 🔥\n📞 ${gymPhone}`;

  return {
    text,
    url: formatWhatsAppUrl(member?.phone || '', text),
  };
}

// Scan memberships and trigger automated email and WhatsApp queue in Hindi
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

    // Build rich Hindi HTML email
    let badgeText = `${daysRemaining} दिन शेष`;
    let badgeColor = '#ffd166';
    let statusText = 'समाप्त होने वाली है';

    if (daysRemaining <= 0) {
      badgeText = '🛑 सदस्यता समाप्त (Expired)';
      badgeColor = '#ef4444';
      statusText = 'समाप्त हो चुकी है';
    } else if (daysRemaining <= 3) {
      badgeText = '⚠️ 3 दिन शेष (अति आवश्यक)';
      badgeColor = '#f97316';
      statusText = 'अंतिम 3 दिन शेष';
    }

    const renderedEmailHtml = buildHindiEmailTemplate({
      gymName,
      gymPhone,
      title: renderedEmailSubject,
      subtitle: 'सदस्यता नवीनीकरण सूचना (Membership Renewal Notice)',
      badgeText,
      badgeColor,
      memberName: member.name,
      planName: plan.name,
      expiryDate: expiryStr,
      daysLeftText: daysRemaining <= 0 ? 'समाप्त' : `${daysRemaining} दिन शेष`,
      statusText,
    });

    // Send Email if member has email
    let emailStatus = 'skipped';
    if (member.email) {
      try {
        await sendEmailDirect({
          to: member.email,
          subject: renderedEmailSubject,
          html: renderedEmailHtml,
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
