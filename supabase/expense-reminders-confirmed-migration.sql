-- Flagged charge workflow: pending queue → confirmed bookkeeping
-- Run after expense-reminders-no-receipt-migration.sql

ALTER TABLE public.expense_reminders
  ADD COLUMN IF NOT EXISTS expense_line_item_id UUID REFERENCES public.expense_line_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution TEXT CHECK (resolution IS NULL OR resolution IN ('receipt', 'no_receipt', 'manual', 'admin'));

ALTER TABLE public.expense_reminders
  DROP CONSTRAINT IF EXISTS expense_reminders_status_check;

ALTER TABLE public.expense_reminders
  ADD CONSTRAINT expense_reminders_status_check
  CHECK (status IN ('pending', 'notified', 'submitted', 'dismissed', 'no_receipt', 'confirmed'));

CREATE INDEX IF NOT EXISTS idx_expense_reminders_confirmed
  ON public.expense_reminders(status, confirmed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_expense_reminders_line_item
  ON public.expense_reminders(expense_line_item_id)
  WHERE expense_line_item_id IS NOT NULL;
