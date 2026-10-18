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
 * Publicly fetches receipt data by receipt number or payment ID.
 * Designed for one-click access from WhatsApp notifications without login.
 */
export async function getPublicReceipt(receiptIdentifier: string): Promise<PublicReceiptData | null> {
  const cleanId = decodeURIComponent(receiptIdentifier).trim();
  if (!cleanId) return null;

  const isNumeric = /^\d+$/.test(cleanId);

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
         OR ($2::boolean AND fp.id = $3::int)
      ORDER BY fp.paid_on DESC
      LIMIT 1`,
    [cleanId, isNumeric, isNumeric ? parseInt(cleanId, 10) : 0]
  );

  return rows[0] || null;
}
