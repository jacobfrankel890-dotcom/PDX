-- Optional: corporate card label for admin filter/export
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS card_type TEXT;

COMMENT ON COLUMN public.profiles.card_type IS 'Corporate card: rho or credit';
