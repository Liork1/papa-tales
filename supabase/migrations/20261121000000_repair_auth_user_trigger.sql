-- Keep signup independent of the caller's search_path. A failed auth.users
-- trigger aborts the entire signup transaction and becomes an Auth HTTP 500.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
