-- ============================================================
-- PDX Expense — Push tokens table + RLS
-- Run in Supabase SQL editor before enabling push in production.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_push_tokens_token
  ON public.user_push_tokens(expo_push_token);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
  ON public.user_push_tokens(user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can view own push tokens"
  ON public.user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON public.user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON public.user_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON public.user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF to_regprocedure('public.handle_updated_at()') IS NULL THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_user_push_tokens_updated_at ON public.user_push_tokens;
CREATE TRIGGER trg_user_push_tokens_updated_at
  BEFORE UPDATE ON public.user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
