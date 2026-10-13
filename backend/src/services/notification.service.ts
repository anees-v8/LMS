import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import type { LeadRow } from '../db/rows.js';

/**
 * FREE, reliable demo-booking notifications — no paid WhatsApp API.
 * Three independent channels, each best-effort (a failure in one never blocks
 * the others or the API response):
 *   1) EMAIL   (SMTP: free Gmail App Password or Resend free tier)   — primary record
 *   2) TELEGRAM(Bot API, 100% free forever)                          — instant phone push
 *   3) IN-APP  (lead already saved to DB → shown in Super Admin panel)
 *
 * All three are triggered from lead.service after the lead is persisted.
 */

let _transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (_transporter) return _transporter;
  const { host, port, user, pass } = env.notify.email;
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  return _transporter;
}

function formatLead(lead: LeadRow): string {
  return [
    `Owner       : ${lead.owner_name}`,
    `Institute   : ${lead.institute_name}`,
    `Phone       : ${lead.phone}`,
    `Email       : ${lead.email || '-'}`,
    `City        : ${lead.city || '-'}`,
    `Students    : ${lead.student_count ?? '-'}`,
    lead.message ? `Message     : ${lead.message}` : null,
    `Received    : ${new Date(lead.created_at).toLocaleString('en-IN')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function sendEmail(lead: LeadRow): Promise<boolean> {
  const cfg = env.notify.email;
  if (!cfg.enabled || !cfg.host || !cfg.to) {
    logger.debug('Email notify skipped (disabled or not configured)');
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: cfg.from,
      to: cfg.to,
      subject: `🔥 New Demo Lead: ${lead.institute_name} (${lead.city || 'N/A'})`,
      text: formatLead(lead),
      html: `<h2>🔥 New Demo Lead</h2><pre style="font-size:14px">${formatLead(lead)}</pre>
             <p><a href="https://wa.me/${lead.phone}">Message ${lead.owner_name} on WhatsApp</a></p>`,
    });
    logger.info('Lead email sent', { to: cfg.to, lead: lead.id });
    return true;
  } catch (err) {
    logger.error('Lead email failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

async function sendTelegram(lead: LeadRow): Promise<boolean> {
  const cfg = env.notify.telegram;
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    logger.debug('Telegram notify skipped (disabled or not configured)');
    return false;
  }
  const text =
    `🔥 *New Demo Lead*\n\n` +
    `*${lead.institute_name}* — ${lead.city || 'N/A'}\n` +
    `👤 ${lead.owner_name}\n` +
    `📞 ${lead.phone}\n` +
    `🎓 ${lead.student_count ?? '?'} students`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      logger.error('Telegram notify failed', { status: res.status, body: await res.text() });
      return false;
    }
    logger.info('Lead Telegram sent', { lead: lead.id });
    return true;
  } catch (err) {
    logger.error('Telegram notify error', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Fire email + telegram in parallel (best-effort). Returns true if AT LEAST
 * one external channel succeeded (in-app inbox always works regardless).
 */
export async function notifyNewLead(lead: LeadRow): Promise<boolean> {
  const [email, telegram] = await Promise.all([sendEmail(lead), sendTelegram(lead)]);
  return email || telegram;
}

export interface EmailChannelStatus {
  enabled: boolean;
  ok?: boolean;
  error?: string;
}

export interface PaymentReceiptEmailInput {
  to: string;
  studentName: string;
  instituteName: string;
  receiptNo: string;
  amount: number;
  paidOn: Date | string;
  method: string;
}

/**
 * Send official fee payment receipt email to student upon payment confirmation.
 * Best-effort: failures never block payment success.
 */
export async function sendPaymentReceiptEmail(input: PaymentReceiptEmailInput): Promise<boolean> {
  const cfg = env.notify.email;
  if (!cfg.enabled || !cfg.host) {
    logger.debug('Receipt email skipped (SMTP not configured or disabled)');
    return false;
  }

  const dateStr = new Date(input.paidOn).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fbf9; border-radius: 12px; border: 1px solid #e1e7e4;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2E6656;">
      <h2 style="color: #1F2E27; margin: 0;">${input.instituteName}</h2>
      <p style="color: #2E6656; font-size: 14px; font-weight: bold; margin-top: 5px;">OFFICIAL FEE PAYMENT RECEIPT</p>
    </div>

    <div style="padding: 20px 0;">
      <p style="font-size: 15px; color: #333;">Dear <strong>${input.studentName}</strong>,</p>
      <p style="font-size: 14px; color: #555;">Thank you for your fee payment. Your transaction has been successfully processed and verified.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <tr style="background-color: #f2f6f4;">
          <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #eee;">Receipt Number</td>
          <td style="padding: 12px 15px; font-size: 13px; font-weight: bold; color: #1F2E27; text-align: right; border-bottom: 1px solid #eee;">${input.receiptNo}</td>
        </tr>
        <tr>
          <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #eee;">Payment Date</td>
          <td style="padding: 12px 15px; font-size: 13px; color: #333; text-align: right; border-bottom: 1px solid #eee;">${dateStr}</td>
        </tr>
        <tr style="background-color: #f2f6f4;">
          <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #eee;">Payment Mode</td>
          <td style="padding: 12px 15px; font-size: 13px; color: #333; text-align: right; text-transform: uppercase; border-bottom: 1px solid #eee;">${input.method}</td>
        </tr>
        <tr>
          <td style="padding: 12px 15px; font-size: 15px; font-weight: bold; color: #1F2E27;">Total Paid</td>
          <td style="padding: 12px 15px; font-size: 18px; font-weight: bold; color: #2E6656; text-align: right;">₹${input.amount}</td>
        </tr>
      </table>

      <div style="background-color: #eaf5ef; border-left: 4px solid #2E6656; padding: 12px 15px; border-radius: 4px; margin-top: 15px;">
        <p style="margin: 0; font-size: 13px; color: #1F2E27;">Status: <strong>Payment Confirmed & Verified</strong></p>
      </div>
    </div>

    <div style="border-top: 1px solid #e1e7e4; padding-top: 15px; text-align: center; font-size: 12px; color: #888;">
      <p style="margin: 0;">This is an electronically generated receipt for your records.</p>
      <p style="margin: 5px 0 0 0;">${input.instituteName} • Powered by Campus LMS</p>
    </div>
  </div>
  `;

  try {
    await getTransporter().sendMail({
      from: cfg.from,
      to: input.to,
      subject: `Fee Payment Receipt: ₹${input.amount} (${input.receiptNo}) - ${input.instituteName}`,
      text: `Dear ${input.studentName},\n\nPayment of ₹${input.amount} received by ${input.instituteName}.\nReceipt No: ${input.receiptNo}\nDate: ${dateStr}\nMethod: ${input.method.toUpperCase()}\n\nThank you!`,
      html,
    });
    logger.info('Payment receipt email sent', { to: input.to, receiptNo: input.receiptNo });
    return true;
  } catch (err) {
    logger.error('Payment receipt email failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** Verify SMTP connectivity (used by a health/diagnostic route). */
export async function verifyEmailChannel(): Promise<EmailChannelStatus> {
  if (!env.notify.email.enabled) return { enabled: false };
  try {
    await getTransporter().verify();
    return { enabled: true, ok: true };
  } catch (err) {
    return { enabled: true, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
