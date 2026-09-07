ALTER TABLE audit_logs ADD COLUMN customer_key TEXT NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN customer_data TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_audit_logs_site_customer ON audit_logs(site, customer_key, event_at DESC);
