-- ============================================================
-- Receipt Uploads — Storage + tracking table
-- Run in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Receipt upload audit / AI analysis log
CREATE TABLE IF NOT EXISTS public.receipt_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'analyzed', 'applied', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_uploads_report ON public.receipt_uploads(report_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_user ON public.receipt_uploads(user_id);

ALTER TABLE public.receipt_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipt uploads"
  ON public.receipt_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt uploads"
  ON public.receipt_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt uploads"
  ON public.receipt_uploads FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage policies: users access only their folder {user_id}/...
CREATE POLICY "Users can upload receipts to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
