/*
# Store private avatar colors

1. Profile change
- Add `avatar_color` to each profile with a cozy sage default.
- Keep the legacy avatar text column for compatibility, but the interface no longer renders it.
2. Security
- Allow authenticated owners to update only their display name and avatar color.
- Preserve the existing owner-scoped profile policies.
3. Signup behavior
- New profiles receive a sage avatar color automatically.
*/

ALTER TABLE public.cozy_profile ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT '#8FA58A';
GRANT UPDATE (display_name, avatar_color) ON public.cozy_profile TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_cozy_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cozy_profile (user_id, display_name, avatar, avatar_color, xp, level)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), 'Mara'),
    'M',
    '#8FA58A',
    0,
    1
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_cozy_user() FROM PUBLIC, anon, authenticated;