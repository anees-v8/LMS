-- ---------- WHATSAPP DAILY DISPATCH LOGS ----------
-- Deduplication log to prevent sending more than 1 alert of the same type per student per day,
-- preventing redundant Meta WhatsApp Cloud API costs.
CREATE TABLE IF NOT EXISTS whatsapp_daily_dispatches (
  id            SERIAL PRIMARY KEY,
  tenant_id     INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  dispatch_type VARCHAR(40) NOT NULL, -- 'absent', 'fee_reminder'
  date          DATE NOT NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id, dispatch_type, date)
);

CREATE INDEX IF NOT EXISTS idx_wa_daily_dispatch 
  ON whatsapp_daily_dispatches(tenant_id, student_id, dispatch_type, date);
