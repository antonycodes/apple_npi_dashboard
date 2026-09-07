CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  site TEXT NOT NULL,
  event_at TEXT NOT NULL,
  action TEXT NOT NULL,
  stage TEXT NOT NULL,
  desk_code TEXT NOT NULL DEFAULT '',
  msnv TEXT NOT NULL DEFAULT '',
  staff_name TEXT NOT NULL DEFAULT '',
  stt TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT 'success',
  detail TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_site_event_at ON audit_logs(site, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_site_stage ON audit_logs(site, stage, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_site_desk ON audit_logs(site, desk_code, event_at DESC);
