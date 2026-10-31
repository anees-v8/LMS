-- ---------- RAZORPAY WEBHOOK IDEMPOTENCY ----------
-- Webhook idempotency was previously a plain SELECT against audit_log
-- before processing, with the INSERT happening afterward in a separate
-- statement — not atomic, so two near-simultaneous deliveries of the same
-- webhook (Razorpay retries on timeout/non-2xx, and can fire order.paid +
-- payment.captured close together for one transaction) could both pass
-- the "not yet processed" check before either committed, double-crediting
-- a fee payment or double-extending a subscription's billing date.
--
-- A UNIQUE constraint + INSERT ... ON CONFLICT DO NOTHING makes the
-- "claim this payment_id" check atomic: only the first of two concurrent
-- webhook deliveries for the same payment can ever get a row back.
CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  payment_id    TEXT PRIMARY KEY,
  order_id      TEXT,
  tenant_id     INT REFERENCES tenants(id) ON DELETE CASCADE,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
