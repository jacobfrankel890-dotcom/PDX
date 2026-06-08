-- Fix "Database error saving new user" on signup
-- Root cause: RLS on profiles blocks INSERT from handle_new_user trigger (no INSERT policy)

-- 1. Harden trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, role, region, phone_verified)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Account'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'kam'::public.user_role),
    COALESCE((NEW.raw_user_meta_data->>'region')::public.pdx_region, 'pdx'::public.pdx_region),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false)
  );
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2. Allow profile row creation during auth signup (trigger runs before session exists)
DROP POLICY IF EXISTS "Allow signup profile creation" ON public.profiles;
CREATE POLICY "Allow signup profile creation"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- 3. Ensure roles can write profiles during signup
GRANT INSERT ON public.profiles TO postgres, service_role, supabase_auth_admin;
GRANT USAGE ON TYPE public.user_role TO postgres, service_role, supabase_auth_admin;
GRANT USAGE ON TYPE public.pdx_region TO postgres, service_role, supabase_auth_admin;
