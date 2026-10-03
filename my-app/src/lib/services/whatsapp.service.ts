import env from '../config/env';
import logger from '../utils/logger';

/**
 * Sends a template message via Meta WhatsApp Cloud API.
 * Uses the platform's central phone number.
 */
async function sendWhatsappTemplate(
  toPhone: string,
  templateName: string,
  components: any[]
): Promise<boolean> {
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
        language: { code: 'en_US' },
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
        { type: 'text', text: instituteName },
        { type: 'text', text: studentName },
        { type: 'text', text: feeTitle },
        { type: 'text', text: String(pending) }
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
        { type: 'text', text: instituteName },
        { type: 'text', text: studentName },
        { type: 'text', text: date }
      ]
    }
  ]);
}

/** Legacy wa.me link generation */
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
    `Namaste ${parentName || ''}, ${studentName} ki ${feeTitle} fees ₹${pending} pending hai. Kripya jaldi jama karein. - ${instituteName}`
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
