import { query } from '../db';

export interface PublicReceiptData {
  id: number;
  receiptNo: string;
  amount: number;
  paidOn: string;
  method: string;
  studentName: string;
  rollNo: string | null;
  phone: string | null;
  email: string | null;
  instituteName: string;
  instituteCity: string | null;
  institutePhone: string | null;
  batchName: string | null;
  feeTitle: string;
}

/**
 * Publicly fetches receipt data by receipt number ONLY (never by raw
 * fee_payments.id). receipt_no is a high-entropy token
 * (RCPT-<tenantId>-<date>-<random4>, see generateReceiptNo); fp.id is a
 * platform-wide sequential integer, so matching on it here would let
 * anyone enumerate /receipt/1, /receipt/2, ... and read every tenant's
 * student PII with no auth — this endpoint is intentionally unauthenticated
 * for one-click WhatsApp access, so receipt_no being unguessable is the
 * ONLY thing standing between a stranger and this data. Every payment row
 * has carried a receipt_no since recordPayment() started generating one
 * (confirmed zero NULL receipt_no rows in production as of this fix).
 */
export async function getPublicReceipt(receiptIdentifier: string): Promise<PublicReceiptData | null> {
  const cleanId = decodeURIComponent(receiptIdentifier).trim();
  if (!cleanId) return null;

  const { rows } = await query<PublicReceiptData>(
    `SELECT fp.id,
            COALESCE(fp.receipt_no, 'RCPT-' || fp.id) AS "receiptNo",
            fp.amount_paid::int AS amount,
            fp.paid_on AS "paidOn",
            COALESCE(fp.method::text, 'online') AS method,
            u.full_name AS "studentName",
            s.roll_no AS "rollNo",
            u.phone AS phone,
            u.email AS email,
            t.name AS "instituteName",
            t.city AS "instituteCity",
            t.contact_phone AS "institutePhone",
            b.name AS "batchName",
            COALESCE(fd.title, 'Tuition / Academic Fee') AS "feeTitle"
       FROM fee_payments fp
       JOIN students s ON s.id = fp.student_id
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = fp.tenant_id
       LEFT JOIN fee_dues fd ON fd.id = fp.fee_due_id
       LEFT JOIN batch_enrollments be ON be.student_id = s.id
       LEFT JOIN batches b ON b.id = be.batch_id
      WHERE fp.receipt_no = $1
      LIMIT 1`,
    [cleanId]
  );

  return rows[0] || null;
}
