-- Add company per expense line item
ALTER TABLE public.expense_line_items ADD COLUMN IF NOT EXISTS company TEXT;
