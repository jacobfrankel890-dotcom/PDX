-- Fix: Submit all failed because UPDATE policy blocked status draft -> submitted.
-- USING allowed old draft row, but implicit WITH CHECK required new row to still be draft.

DROP POLICY IF EXISTS "Users can update own draft reports" ON public.expense_reports;

CREATE POLICY "Users can update own draft reports"
  ON public.expense_reports FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'rejected'))
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('draft', 'rejected', 'submitted')
  );
