-- Make phone optional for email-only signup (Twilio OTP can be re-enabled later)
-- Run in Supabase SQL Editor

ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, role, region, phone_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'kam'),
    COALESCE((NEW.raw_user_meta_data->>'region')::pdx_region, 'pdx'),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
