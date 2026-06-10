-- Track when employee opened a flagged-charge notification (separate from submit/dismiss).
-- Run after expense-reminders-migration.sql

ALTER TABLE public.expense_reminders
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_expense_reminders_user_unread
  ON public.expense_reminders(user_id, read_at)
  WHERE status IN ('pending', 'notified');
