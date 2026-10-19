import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Sends a template message via Meta WhatsApp Cloud API.
 * Uses the platform's central phone number.
 */
async function sendWhatsappTemplate(
  toPhone: string,
  templateName: string,
  components: any[]
): Promise<boolean> {
  // Always strip non-digits and append country code 91 if it's 10 digits
  let clean = String(toPhone).replace(/[^\d]/g, '');
  if (clean.length === 10) clean = '91' + clean;

  if (!env.whatsapp?.token || !env.whatsapp?.phoneId) {
    logger.warn('WhatsApp API not configured — skipping automated message.', { toPhone, templateName });
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${env.whatsapp.phoneId}/messages`;
    
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: clean,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en', // Matches approved template language
        },
        components,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('WhatsApp API Error', { status: response.status, error: errText });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** Fallback deep-link generator for manual sharing if needed */
export function buildWaUrl(phone: string | number, message: string): string {
  let clean = String(phone).replace(/[^\d]/g, '');
  if (clean.length === 10) clean = '91' + clean;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export async function sendFeeReminder({
  parentPhone,
  studentName,
  feeTitle,
  pending,
  instituteName,
}: {
  parentPhone: string;
  studentName: string;
  feeTitle: string;
  pending: number;
  instituteName: string;
}) {
  return sendWhatsappTemplate(parentPhone, 'fee_reminder_alert', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(pending) }, // {{1}} Pending Amount (₹)
        { type: 'text', text: feeTitle },        // {{2}} Fee Title
        { type: 'text', text: studentName },     // {{3}} Student name
        { type: 'text', text: instituteName }    // {{4}} Institute name
      ]
    }
  ]);
}

export async function sendAbsentAlert({
  parentPhone,
  studentName,
  instituteName,
  date,
}: {
  parentPhone: string;
  studentName: string;
  instituteName: string;
  date: string;
}) {
  return sendWhatsappTemplate(parentPhone, 'student_absent_alert', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: studentName },   // {{1}} Student name
        { type: 'text', text: date },          // {{2}} Date
        { type: 'text', text: instituteName }  // {{3}} Institute name
      ]
    }
  ]);
}

export async function sendPaymentReceipt({
  parentPhone,
  amount,
  feeType,
  studentName,
  instituteName,
  receiptPath = 'student/fees',
}: {
  parentPhone: string;
  amount: number | string;
  feeType: string;
  studentName: string;
  instituteName: string;
  receiptPath?: string;
}) {
  return sendWhatsappTemplate(parentPhone, 'payment_receipt_alert', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amount) },  // {{1}} Amount
        { type: 'text', text: feeType },         // {{2}} Fee type
        { type: 'text', text: studentName },     // {{3}} Student name
        { type: 'text', text: instituteName }    // {{4}} Institute name
      ]
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        { type: 'text', text: receiptPath }
      ]
    }
  ]);
}

export async function sendTestMissedAlert({
  parentPhone,
  studentName,
  testTitle,
  instituteName,
}: {
  parentPhone: string;
  studentName: string;
  testTitle: string;
  instituteName: string;
}) {
  return sendWhatsappTemplate(parentPhone, 'test_missed_alert', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: studentName },   // {{1}} Student name
        { type: 'text', text: testTitle },     // {{2}} Test title
        { type: 'text', text: instituteName }  // {{3}} Institute name
      ]
    }
  ]);
}

/** Legacy wa.me link generation (still needed for some non-automated buttons) */
export function feeReminderMessage({
  parentName,
  studentName,
  feeTitle,
  pending,
  instituteName,
}: {
  parentName?: string | null;
  studentName: string;
  feeTitle: string;
  pending: number;
  instituteName: string;
}): string {
  return (
    `Namaste ${parentName || ''}, ${studentName} ki ${feeTitle} fees ₹${pending} ` +
    `pending hai. Kripya jaldi jama karein. - ${instituteName}`
  );
}

export function absentMessage({
  studentName,
  instituteName,
  date,
}: {
  studentName: string;
  instituteName: string;
  date: string;
}): string {
  return `Namaste, aaj ${date} ko ${studentName} class me absent the. - ${instituteName}`;
}

export function doubtMessage({
  studentName,
  instituteName,
  chapter,
}: {
  studentName: string;
  instituteName: string;
  chapter: string;
}): string {
  return `Sir, mujhe ${chapter} mein doubt hai. - ${studentName} (${instituteName})`;
}
