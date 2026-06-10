-- Allow employees to mark a flagged charge as "no receipt available"
-- Run after expense-reminders-migration.sql

ALTER TABLE public.expense_reminders
  DROP CONSTRAINT IF EXISTS expense_reminders_status_check;

ALTER TABLE public.expense_reminders
  ADD CONSTRAINT expense_reminders_status_check
  CHECK (status IN ('pending', 'notified', 'submitted', 'dismissed', 'no_receipt'));
