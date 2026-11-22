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
export function buildNewMemberWelcomeEmailHtml({
  gymName,
  gymPhone,
  portalUrl,
  memberName,
  email,
  password,
  planName,
  expiryDate,
  status = 'सक्रिय (Active)',
}: {
  gymName: string;
  gymPhone: string;
  portalUrl?: string;
  memberName: string;
  email: string;
  password?: string;
  planName?: string;
  expiryDate?: string;
  status?: string;
}) {
  const rawLoginUrl = portalUrl || 'https://fitness-villa-front-end.vercel.app/login';
  const loginUrl = rawLoginUrl.includes('localhost')
    ? 'https://fitness-villa-front-end.vercel.app/login'
    : rawLoginUrl;
  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>फिटनेस विला में आपका स्वागत है</title>
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
                🎉 स्वागतम् · WELCOME TO FITNESS VILLA
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${gymName}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">आपकी फिटनेस यात्रा की शुरुआत के लिए बहुत-बहुत बधाई!</p>
            </td>
          </tr>

          <!-- Welcome Badge -->
          <tr>
            <td style="padding:24px 24px 10px;text-align:center;">
              <span style="display:inline-block;padding:8px 18px;border-radius:8px;background:rgba(181,242,61,0.15);border:1px solid #b5f23d;color:#b5f23d;font-size:14px;font-weight:700;">
                ✅ सदस्यता पंजीकरण सफल (Registration Successful)
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
                <strong style="color:#ffffff;">${gymName}</strong> परिवार में आपका हार्दिक स्वागत है! आपका नया सदस्य खाता और सदस्यता प्लान सफलतापूर्वक सक्रिय कर दिया गया है। आपका संपूर्ण विवरण नीचे दिया गया है:
              </p>

              <!-- Membership Details Table -->
              <table role="presentation" width="100%" style="background:#090d0a;border:1px solid #1f2a21;border-radius:10px;margin-bottom:22px;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">सदस्य का नाम (Member Name)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">सदस्यता प्लान (Plan)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#b5f23d;font-size:14px;font-weight:700;text-align:right;">${planName || 'मानक सदस्यता (Standard Access)'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">समाप्ति तिथि (Expiry Date)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">${expiryDate || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:13px;">वर्तमान स्थिति (Status)</td>
                  <td style="padding:12px 16px;color:#b5f23d;font-size:14px;font-weight:700;text-align:right;">${status}</td>
                </tr>
              </table>

              <!-- Member Login Credentials Box -->
              ${password ? `
              <div style="background:#131c15;border:1px solid #2e4726;border-radius:10px;padding:20px;margin-bottom:22px;">
                <h3 style="margin:0 0 12px;font-size:15px;color:#b5f23d;display:flex;align-items:center;gap:8px;">
                  🔐 आपका सदस्य पोर्टल लॉगिन विवरण (Login Credentials)
                </h3>
                <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">
                  आप अपने मोबाइल या कंप्यूटर से फिटनेस विला पोर्टल में लॉगिन करके अपनी उपस्थिति, वर्कआउट और सदस्यता देख सकते हैं:
                </p>
                <table role="presentation" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#9ca3af;font-size:13px;width:130px;">लॉगिन पोर्टल URL:</td>
                    <td style="padding:6px 0;"><a href="${loginUrl}" style="color:#b5f23d;font-weight:600;text-decoration:none;">${loginUrl}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#9ca3af;font-size:13px;">लॉगिन ईमेल (ID):</td>
                    <td style="padding:6px 0;color:#ffffff;font-family:monospace;font-size:14px;font-weight:700;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#9ca3af;font-size:13px;">पासवर्ड (Password):</td>
                    <td style="padding:6px 0;color:#b5f23d;font-family:monospace;font-size:15px;font-weight:800;letter-spacing:1px;background:#090d0a;display:inline-block;padding:2px 8px;border-radius:4px;border:1px solid #233125;">${password}</td>
                  </tr>
                </table>
                <div style="margin-top:12px;font-size:12px;color:#f59e0b;background:rgba(245,158,11,0.1);padding:8px 12px;border-radius:6px;border-left:3px solid #f59e0b;">
                  🔒 सुरक्षा सूचना: अपने खाते की सुरक्षा के लिए कृपया पहले लॉगिन के बाद अपना पासवर्ड अवश्य बदल लें।
                </div>
              </div>
              ` : ''}

              <!-- Call to Action Button -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${loginUrl}" style="display:inline-block;background:#b5f23d;color:#090c0a;font-weight:800;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
                  पोर्टल में लॉगिन करें (Member Login) →
                </a>
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
                यह एक आधिकारिक स्वागत ईमेल है। यदि आपने यह खाता नहीं बनाया है तो तुरंत जिम रिसेप्शन पर संपर्क करें।
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

// Responsive Luxury Payment Receipt HTML Email Builder in Hindi
export function buildPaymentReceiptEmailHtml({
  gymName,
  gymPhone,
  portalUrl,
  memberName,
  email,
  receiptNumber,
  amountPaid,
  paymentMethod,
  dateStr,
  planName,
  totalPlanPrice,
  paidSoFar,
  dueBalance,
  notes,
}: {
  gymName: string;
  gymPhone: string;
  portalUrl?: string;
  memberName: string;
  email: string;
  receiptNumber: string;
  amountPaid: string;
  paymentMethod: string;
  dateStr: string;
  planName?: string;
  totalPlanPrice?: string;
  paidSoFar?: string;
  dueBalance?: string;
  notes?: string;
}) {
  const rawLoginUrl = portalUrl || 'https://fitness-villa-front-end.vercel.app/login';
  const loginUrl = rawLoginUrl.includes('localhost')
    ? 'https://fitness-villa-front-end.vercel.app/login'
    : rawLoginUrl;

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>भुगतान रसीद - ${gymName}</title>
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
                💳 आधिकारिक भुगतान रसीद · PAYMENT RECEIPT
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${gymName}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">रसीद संख्या: <span style="font-family:monospace;color:#b5f23d;font-weight:700;">#${receiptNumber}</span></p>
            </td>
          </tr>

          <!-- Verified Badge -->
          <tr>
            <td style="padding:24px 24px 10px;text-align:center;">
              <span style="display:inline-block;padding:8px 18px;border-radius:8px;background:rgba(181,242,61,0.15);border:1px solid #b5f23d;color:#b5f23d;font-size:14px;font-weight:700;">
                ✅ भुगतान सफल एवं सत्यापित (Payment Verified)
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
                <strong style="color:#ffffff;">${gymName}</strong> में आपके द्वारा किया गया भुगतान सफलतापूर्वक प्राप्त हो गया है। आपकी रसीद का विवरण निम्नलिखित है:
              </p>

              <!-- Payment Details Table -->
              <table role="presentation" width="100%" style="background:#090d0a;border:1px solid #1f2a21;border-radius:10px;margin-bottom:22px;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">रसीद संख्या (Receipt No)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-family:monospace;font-weight:700;text-align:right;">${receiptNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">सदस्य का नाम (Member Name)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">जमा राशि (Amount Paid)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#b5f23d;font-size:18px;font-weight:800;text-align:right;">${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">भुगतान माध्यम (Method)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;text-transform:uppercase;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">दिनांक व समय (Date & Time)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${dateStr}</td>
                </tr>
                ${planName ? `
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">प्लान / विवरण (Plan / Purpose)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#b5f23d;font-size:14px;font-weight:700;text-align:right;">${planName}</td>
                </tr>
                ` : ''}
                ${totalPlanPrice ? `
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">कुल प्लान शुल्क (Total Plan Fee)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${totalPlanPrice}</td>
                </tr>
                ` : ''}
                ${paidSoFar ? `
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#9ca3af;font-size:13px;">अब तक कुल जमा (Total Paid)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1a241c;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${paidSoFar}</td>
                </tr>
                ` : ''}
                ${dueBalance ? `
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:13px;">शेष बकाया राशि (Remaining Due)</td>
                  <td style="padding:12px 16px;color:${dueBalance === '₹0' || dueBalance === '0' ? '#b5f23d' : '#ef4444'};font-size:14px;font-weight:700;text-align:right;">${dueBalance}</td>
                </tr>
                ` : ''}
              </table>

              ${notes ? `
              <div style="background:#131c15;border:1px solid #233125;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#9ca3af;">
                📌 <strong>टिप्पणी (Note):</strong> ${notes}
              </div>
              ` : ''}

              <!-- Portal Link -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${loginUrl}" style="display:inline-block;background:#b5f23d;color:#090c0a;font-weight:800;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
                  पोर्टल में रसीद व विवरण देखें →
                </a>
              </div>

              <!-- Contact & Help -->
              <p style="font-size:13px;color:#9ca3af;margin:0 0 6px;">
                📞 किसी भी प्रश्न या सहायता के लिए हमारे हेल्पलाइन नंबर पर संपर्क करें:
              </p>
              <p style="font-size:16px;font-weight:700;color:#b5f23d;margin:0 0 20px;">
                ${gymPhone || 'जिम रिसेप्शन'}
              </p>

              <hr style="border:none;border-top:1px solid #233125;margin:24px 0 16px;">
              <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
                फिटनेस विला को चुनने के लिए धन्यवाद! ऐसे ही मेहनत करते रहें! 💪🔥<br>
                <strong>टीम ${gymName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;text-align:center;background:#060807;border-top:1px solid #1f2a21;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                यह एक कम्प्यूटर जनरेटेड इलेक्ट्रॉनिक रसीद है। किसी भौतिक हस्ताक्षर की आवश्यकता नहीं है।
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

// Responsive Luxury Payment Due Reminder HTML Email Builder in Hindi
export function buildPaymentDueReminderEmailHtml({
  gymName,
  gymPhone,
  portalUrl,
  memberName,
  email,
  dueAmount,
  planName,
  totalPlanPrice,
  paidSoFar,
  expiryDate,
}: {
  gymName: string;
  gymPhone: string;
  portalUrl?: string;
  memberName: string;
  email: string;
  dueAmount: string;
  planName: string;
  totalPlanPrice: string;
  paidSoFar: string;
  expiryDate: string;
}) {
  const rawLoginUrl = portalUrl || 'https://fitness-villa-front-end.vercel.app/login';
  const loginUrl = rawLoginUrl.includes('localhost')
    ? 'https://fitness-villa-front-end.vercel.app/login'
    : rawLoginUrl;

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>बकाया शुल्क सूचना - ${gymName}</title>
</head>
<body style="margin:0;padding:0;background-color:#070908;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070908;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background:#101512;border:1px solid #3d281a;border-radius:14px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.7);">
          
          <!-- Header -->
          <tr>
            <td style="padding:28px 24px 20px;text-align:center;background:linear-gradient(180deg,#241812 0%,#101512 100%);border-bottom:1px solid #3d281a;">
              <div style="display:inline-block;padding:6px 14px;background:#2b1a10;border:1px solid #f59e0b;border-radius:30px;color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">
                ⚠️ बकाया शुल्क अनुस्मारक · PAYMENT DUE ALERT
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${gymName}</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">आपकी जिम सदस्यता का बकाया शुल्क लंबित है</p>
            </td>
          </tr>

          <!-- Due Amount Badge -->
          <tr>
            <td style="padding:24px 24px 10px;text-align:center;">
              <span style="display:inline-block;padding:10px 22px;border-radius:8px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;font-size:16px;font-weight:800;">
                कुल बकाया राशि: ${dueAmount}
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
                <strong style="color:#ffffff;">${gymName}</strong> से यह एक विनम्र स्मरण सूचना है। आपकी वर्तमान जिम सदस्यता का शुल्क बकाया है। अबाध जिम प्रवेश और वर्कआउट की निरंतरता के लिए कृपया अपनी बकाया राशि का शीघ्र भुगतान करें।
              </p>

              <!-- Due Details Table -->
              <table role="presentation" width="100%" style="background:#090d0a;border:1px solid #2d2218;border-radius:10px;margin-bottom:22px;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#9ca3af;font-size:13px;">सदस्य का नाम (Member Name)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">${memberName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#9ca3af;font-size:13px;">सदस्यता प्लान (Membership Plan)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#b5f23d;font-size:14px;font-weight:700;text-align:right;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#9ca3af;font-size:13px;">कुल प्लान शुल्क (Total Plan Cost)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${totalPlanPrice}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#9ca3af;font-size:13px;">अब तक जमा राशि (Paid So Far)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${paidSoFar}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#9ca3af;font-size:13px;">कुल बकाया राशि (Pending Due)</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #1f1a14;color:#ef4444;font-size:18px;font-weight:800;text-align:right;">${dueAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:13px;">सदस्यता समाप्ति तिथि (Expiry Date)</td>
                  <td style="padding:12px 16px;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${expiryDate}</td>
                </tr>
              </table>

              <!-- Action Info -->
              <div style="background:#1a140d;border:1px solid #4a341b;border-radius:10px;padding:16px;margin-bottom:22px;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#f59e0b;">
                  💳 भुगतान कैसे करें (How to Pay):
                </p>
                <p style="margin:0;font-size:13px;color:#d1d5db;line-height:1.6;">
                  आप अपनी बकाया राशि सीधे जिम रिसेप्शन पर नकद, कार्ड या UPI (GPay/PhonePe/Paytm) द्वारा जमा करवा सकते हैं।
                </p>
              </div>

              <!-- Portal Link -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${loginUrl}" style="display:inline-block;background:#f59e0b;color:#090c0a;font-weight:800;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
                  सदस्य पोर्टल में स्थिति देखें →
                </a>
              </div>

              <!-- Contact & Help -->
              <p style="font-size:13px;color:#9ca3af;margin:0 0 6px;">
                📞 किसी भी असुविधा या पूछताछ के लिए जिम हेल्पलाइन पर संपर्क करें:
              </p>
              <p style="font-size:16px;font-weight:700;color:#b5f23d;margin:0 0 20px;">
                ${gymPhone || 'जिम रिसेप्शन'}
              </p>

              <hr style="border:none;border-top:1px solid #233125;margin:24px 0 16px;">
              <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">
                आपके सहयोग के लिए धन्यवाद! 💪🔥<br>
                <strong>टीम ${gymName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;text-align:center;background:#060807;border-top:1px solid #1f2a21;">
              <p style="margin:0;font-size:11px;color:#6b7280;">
                यह एक सिस्टम जनरेटेड स्वचालित बकाया अनुस्मारक ईमेल है। यदि आप पहले ही भुगतान कर चुके हैं तो कृपया इस संदेश को अनदेखा करें।
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

// Send real email direct (Supports Google Apps Script HTTP 443 + Brevo HTTP 443 + Resend HTTP 443 + Nodemailer SMTP)
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
  const gymName = settings?.gymName || 'Fitness Villa';
  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL || (settings as any)?.googleScriptUrl;
  const brevoApiKey = process.env.BREVO_API_KEY || (settings as any)?.brevoApiKey;
  const resendApiKey = process.env.RESEND_API_KEY || (settings as any)?.resendApiKey;

  // 1. Google Apps Script Web App (Native Gmail direct from ritikjain6224@gmail.com over HTTPS Port 443, No domain needed!)
  if (googleScriptUrl) {
    const res = await fetch(googleScriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        fromName: gymName,
      }),
      redirect: 'follow',
    });

    const resData = await res.json().catch(() => ({}));
    if (resData?.success === false) {
      throw new Error(resData?.error || 'Google Apps Script delivery error');
    }

    console.log(`[EMAIL SENT VIA GOOGLE APPS SCRIPT HTTP 443] to ${to}`);
    return { info: resData, isLive: true };
  }

  // 2. Brevo REST API (HTTPS Port 443, Free 300 emails/day, sends from verified Gmail to any recipient!)
  if (brevoApiKey) {
    const senderEmail = settings?.smtpUser || settings?.email || 'ritikjain6224@gmail.com';
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: gymName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>/g, ''),
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resData?.message || 'Brevo HTTP API error');
    }

    console.log(`[EMAIL SENT VIA BREVO HTTP 443] to ${to} (MessageId: ${resData.messageId})`);
    return { info: resData, isLive: true };
  }

  // 3. Resend HTTP API (HTTPS Port 443)
  if (resendApiKey) {
    let from = 'Fitness Villa <onboarding@resend.dev>';
    const customFrom = process.env.RESEND_FROM || settings?.smtpFrom;
    if (customFrom && !customFrom.includes('@gmail.com') && !customFrom.includes('@yahoo.com') && !customFrom.includes('@hotmail.com')) {
      from = customFrom;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: settings?.smtpUser || settings?.email || 'ritikjain6224@gmail.com',
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

  // 4. Otherwise send via Nodemailer SMTP (Port 465)
  const transporterObj = await createNodemailerTransporter();
  const from = process.env.SMTP_FROM || settings?.smtpFrom || transporterObj.senderUser || settings?.email || 'noreply@fitnessvilla.in';

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
    brevoApiKey?: string;
    googleScriptUrl?: string;
  }
) {
  const settings = await GymSettings.findOne();
  const googleScriptUrl = overrides?.googleScriptUrl || process.env.GOOGLE_SCRIPT_URL || (settings as any)?.googleScriptUrl;
  const brevoApiKey = overrides?.brevoApiKey || process.env.BREVO_API_KEY || (settings as any)?.brevoApiKey;
  const resendApiKey = overrides?.resendApiKey || process.env.RESEND_API_KEY || (settings as any)?.resendApiKey;

  const gymName = settings?.gymName || 'Fitness Villa';
  const testHtml = buildHindiEmailTemplate({
    gymName,
    gymPhone: settings?.phone || settings?.whatsapp || '9876543210',
    title: 'परीक्षण ईमेल (Delivery Test Email)',
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

  // 1. Google Apps Script Webhook (Port 443)
  if (googleScriptUrl) {
    const res = await fetch(googleScriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: targetEmail,
        subject: `[परीक्षण ईमेल] ${gymName} - ईमेल डिलीवरी सत्यापन सफल ✅`,
        html: testHtml,
        text: `नमस्ते! ${gymName} की ईमेल प्रणाली सफलतापूर्वक जुड़ चुकी है और ठीक से काम कर रही है।`,
        fromName: gymName,
      }),
      redirect: 'follow',
    });

    const resData = await res.json().catch(() => ({}));
    if (resData?.success === false) {
      throw new Error(resData?.error || 'Google Apps Script delivery error');
    }
    return { success: true, messageId: 'google-script-ok', recipient: targetEmail };
  }

  // 2. Brevo HTTP API (Port 443)
  if (brevoApiKey) {
    const senderEmail = overrides?.smtpUser || settings?.smtpUser || settings?.email || 'ritikjain6224@gmail.com';
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: gymName, email: senderEmail },
        to: [{ email: targetEmail }],
        subject: `[परीक्षण ईमेल] ${gymName} - ईमेल डिलीवरी सत्यापन सफल ✅`,
        htmlContent: testHtml,
        textContent: `नमस्ते! ${gymName} की ईमेल प्रणाली सफलतापूर्वक जुड़ चुकी है और ठीक से काम कर रही है।`,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(resData?.message || 'Brevo HTTP API error');
    }
    return { success: true, messageId: resData.messageId, recipient: targetEmail };
  }

  // 3. Resend HTTP (Port 443)
  if (resendApiKey) {
    let from = 'Fitness Villa <onboarding@resend.dev>';
    const customFrom = overrides?.smtpFrom || process.env.RESEND_FROM || settings?.smtpFrom;
    if (customFrom && !customFrom.includes('@gmail.com') && !customFrom.includes('@yahoo.com') && !customFrom.includes('@hotmail.com')) {
      from = customFrom;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        reply_to: overrides?.smtpUser || settings?.smtpUser || settings?.email || 'ritikjain6224@gmail.com',
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

  // 4. Otherwise send via Nodemailer SMTP (Port 465)
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

// ── Send Payment Receipt Email Notification ──────────────────────────────
export async function sendPaymentReceiptNotification({
  paymentId,
  actorUserId,
}: {
  paymentId: string;
  actorUserId?: string;
}) {
  const payment: any = await Payment.findById(paymentId)
    .populate('member')
    .populate({ path: 'membership', populate: { path: 'plan' } });

  if (!payment) throw new Error('भुगतान रिकॉर्ड नहीं मिला (Payment record not found)');
  const member = payment.member;
  if (!member || !member.email) {
    return { success: false, message: 'सदस्य का ईमेल उपलब्ध नहीं है (Member email not available)' };
  }

  const settings = await GymSettings.findOne().lean();
  const gymName = settings?.gymName || 'Fitness Villa';
  const gymPhone = settings?.phone || settings?.whatsapp || '';

  const receiptNo = payment.receiptNumber || `RCP-${payment._id.toString().slice(-6).toUpperCase()}`;
  const amountPaid = `₹${(payment.amountPaise / 100).toLocaleString('en-IN')}`;

  const methodMap: Record<string, string> = {
    cash: 'नकद (Cash)',
    upi: 'UPI (GPay / PhonePe / Paytm)',
    card: 'डेबिट / क्रेडिट कार्ड (Card)',
    razorpay: 'ऑनलाइन भुगतान (Razorpay)',
    bank_transfer: 'बैंक ट्रांसफर (NEFT / IMPS)',
  };
  const paymentMethod = methodMap[payment.method] || payment.method.toUpperCase();

  const paidDate = payment.paidAt || payment.createdAt || new Date();
  const dateStr = new Date(paidDate).toLocaleString('hi-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  let planName = payment.membership?.plan?.name || '';
  let totalPlanPrice = '';
  let paidSoFar = '';
  let dueBalance = '';

  if (payment.membership) {
    const allPayments = await Payment.find({ membership: payment.membership._id, status: 'paid' });
    const totalPaidPaise = allPayments.reduce((s, p) => s + p.amountPaise, 0);
    const planPricePaise = payment.membership.plan?.pricePaise || 0;
    const duePaise = Math.max(0, planPricePaise - totalPaidPaise);

    if (planPricePaise > 0) {
      totalPlanPrice = `₹${(planPricePaise / 100).toLocaleString('en-IN')}`;
      paidSoFar = `₹${(totalPaidPaise / 100).toLocaleString('en-IN')}`;
      dueBalance = `₹${(duePaise / 100).toLocaleString('en-IN')}`;
    }
  }

  const html = buildPaymentReceiptEmailHtml({
    gymName,
    gymPhone,
    memberName: member.name,
    email: member.email,
    receiptNumber: receiptNo,
    amountPaid,
    paymentMethod,
    dateStr,
    planName,
    totalPlanPrice,
    paidSoFar,
    dueBalance,
    notes: payment.notes,
  });

  const subject = `💳 भुगतान रसीद #${receiptNo} — ${gymName} (${amountPaid})`;

  try {
    await sendEmailDirect({
      to: member.email,
      subject,
      html,
    });

    await NotificationLog.create({
      member: member._id,
      templateKey: 'payment_received',
      channel: 'email',
      recipient: member.email,
      body: `Payment Receipt #${receiptNo} for ${amountPaid} sent via email`,
      status: 'sent',
      sentAt: new Date(),
      triggeredBy: actorUserId || null,
    });

    return {
      success: true,
      email: member.email,
      receiptNumber: receiptNo,
      message: `ईमेल रसीद सफलतापूर्वक ${member.email} पर भेज दी गई है!`,
    };
  } catch (err: any) {
    await NotificationLog.create({
      member: member._id,
      templateKey: 'payment_received',
      channel: 'email',
      recipient: member.email,
      body: `Payment Receipt #${receiptNo} failed: ${err.message}`,
      status: 'failed',
      errorDetails: err.message,
      sentAt: new Date(),
      triggeredBy: actorUserId || null,
    });
    throw err;
  }
}

// ── Send Payment Due Reminder Notification ───────────────────────────────
export async function sendDueReminderNotification({
  membershipId,
  actorUserId,
}: {
  membershipId: string;
  actorUserId?: string;
}) {
  const membership: any = await Membership.findById(membershipId)
    .populate('member')
    .populate('plan');

  if (!membership) throw new Error('सदस्यता रिकॉर्ड नहीं मिला (Membership record not found)');
  const member = membership.member;
  const plan = membership.plan;
  if (!member || !member.email) {
    throw new Error('सदस्य का ईमेल उपलब्ध नहीं है (Member email not found)');
  }
  if (!plan) {
    throw new Error('प्लान का विवरण उपलब्ध नहीं है (Plan details not found)');
  }

  const payments = await Payment.find({ membership: membership._id, status: 'paid' });
  const paidPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);
  const planPricePaise = plan.pricePaise || 0;
  const duePaise = planPricePaise - paidPaise;

  if (duePaise <= 0) {
    return { success: false, message: 'इस सदस्य का कोई बकाया शुल्क नहीं है (No pending due)' };
  }

  const settings = await GymSettings.findOne().lean();
  const gymName = settings?.gymName || 'Fitness Villa';
  const gymPhone = settings?.phone || settings?.whatsapp || '';

  const dueAmount = `₹${(duePaise / 100).toLocaleString('en-IN')}`;
  const totalPlanPrice = `₹${(planPricePaise / 100).toLocaleString('en-IN')}`;
  const paidSoFar = `₹${(paidPaise / 100).toLocaleString('en-IN')}`;
  const expiryDate = membership.endDate
    ? new Date(membership.endDate).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const html = buildPaymentDueReminderEmailHtml({
    gymName,
    gymPhone,
    memberName: member.name,
    email: member.email,
    dueAmount,
    planName: plan.name,
    totalPlanPrice,
    paidSoFar,
    expiryDate,
  });

  const subject = `⚠️ बकाया सदस्यता शुल्क सूचना — ${gymName} (${dueAmount})`;

  try {
    await sendEmailDirect({
      to: member.email,
      subject,
      html,
    });

    await NotificationLog.create({
      member: member._id,
      templateKey: 'payment_due',
      channel: 'email',
      recipient: member.email,
      body: `Payment Due Alert for ${dueAmount} (${plan.name}) sent via email`,
      status: 'sent',
      sentAt: new Date(),
      triggeredBy: actorUserId || null,
    });

    return {
      success: true,
      email: member.email,
      dueAmount,
      message: `बकाया शुल्क सूचना सफलतापूर्वक ${member.email} पर भेज दी गई है!`,
    };
  } catch (err: any) {
    await NotificationLog.create({
      member: member._id,
      templateKey: 'payment_due',
      channel: 'email',
      recipient: member.email,
      body: `Payment Due Alert failed: ${err.message}`,
      status: 'failed',
      errorDetails: err.message,
      sentAt: new Date(),
      triggeredBy: actorUserId || null,
    });
    throw err;
  }
}
