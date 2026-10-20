import cron from 'node-cron';
import { runAutomatedExpiryScan } from './notificationService.js';

let cronTask: any = null;

export function initCronJobs() {
  if (cronTask) {
    cronTask.stop();
  }

  // Run everyday at 09:00 AM
  cronTask = cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running daily automated membership expiry scan...');
    try {
      const res = await runAutomatedExpiryScan();
      console.log(`[CRON] Expiry scan complete. Scanned: ${res.scanned}, Emails sent: ${res.emailsSent}, WhatsApp queued: ${res.whatsappQueued}`);
    } catch (err: any) {
      console.error('[CRON] Error during membership expiry scan:', err.message);
    }
  });

  console.log('[CRON] Automated membership expiry notification cron job registered (runs daily at 9:00 AM).');
}
