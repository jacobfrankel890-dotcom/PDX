-- Set company from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, role, region, company, phone_verified)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Account'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'kam'::public.user_role),
    COALESCE((NEW.raw_user_meta_data->>'region')::public.pdx_region, 'pdx'::public.pdx_region),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'company'), ''), 'Parts Distribution Xpress'),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false)
  );
  RETURN NEW;
END;
$$;
