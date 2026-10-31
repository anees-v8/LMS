-- ---------- FEE PAYMENTS AMOUNT HARDENING ----------
-- fee_payments.amount_paid previously had no DB-level CHECK, unlike
-- fee_dues.amount (>= 0) and batches.installment_count (1-12) — every
-- current call site (recordPaymentSchema's z.coerce.number().int().min(1),
-- the student-fee verify route's amount<=0 guard, the Razorpay webhook's
-- own Math.round(amountPaise/100) from a signed payload) already validates
-- a positive amount before reaching recordPayment(), so this wasn't
-- exploitable through any existing route — this is a defense-in-depth
-- backstop against a future direct INSERT/call site that forgets to.
ALTER TABLE fee_payments
  ADD CONSTRAINT fee_payments_amount_paid_positive CHECK (amount_paid > 0);
