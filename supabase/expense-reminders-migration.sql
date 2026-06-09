-- ============================================================
-- PDX Expense — Missing expense reminders (reconciliation push)
-- Run after push-tokens-migration.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expense_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  merchant TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'submitted', 'dismissed')),
  notified_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_reminders_user_id
  ON public.expense_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_expense_reminders_status
  ON public.expense_reminders(status);

ALTER TABLE public.expense_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own expense reminders" ON public.expense_reminders;
CREATE POLICY "Users can view own expense reminders"
  ON public.expense_reminders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expense reminders" ON public.expense_reminders;
CREATE POLICY "Users can update own expense reminders"
  ON public.expense_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_expense_reminders_updated_at ON public.expense_reminders;
CREATE TRIGGER trg_expense_reminders_updated_at
  BEFORE UPDATE ON public.expense_reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
