-- Credit card statement uploads for admin reconciliation
-- Run after schema.sql + expense-reminders-migration.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('statements', 'statements', false, 20971520)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.cc_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_type TEXT CHECK (card_type IN ('rho', 'credit')),
  statement_end DATE,
  date_from DATE,
  date_to DATE,
  statement_total NUMERIC(12, 2),
  file_name TEXT,
  storage_path TEXT,
  parse_source TEXT CHECK (parse_source IN ('xlsx', 'csv', 'pdf_ai', 'manual')),
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_statements_end ON public.cc_statements(statement_end DESC);

ALTER TABLE public.cc_statements ENABLE ROW LEVEL SECURITY;

-- Service role / backend only for now (no user policies until auth)
