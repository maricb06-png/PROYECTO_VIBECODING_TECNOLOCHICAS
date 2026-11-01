/*
# Make automatic profile creation compatible with legacy rows

1. Function change
- Keep the automatic level-1 profile creation after signup.
- Use a conflict-safe insert that works while preserved legacy profiles have no owner.
2. Security
- Keep the fixed public search path.
- Keep client roles from calling the profile trigger directly.
*/

CREATE OR REPLACE FUNCTION public.handle_new_cozy_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cozy_profile (user_id, display_name, avatar, xp, level)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), 'Mara'),
    LEFT(COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), 'M'), 1),
    0,
    1
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_cozy_user() FROM PUBLIC, anon, authenticated;