/*
# Protect Cozy Life progression values

1. Profile write rules
- Keep display name and avatar editable by the signed-in owner.
- Remove direct client write access to user_id, XP, level, and deletion of profiles.
2. XP mutation
- Add `add_cozy_xp(p_delta)` as a SECURITY DEFINER function.
- Only the authenticated caller's own profile is changed.
- The delta is bounded to the task and habit rewards used by the app.
- Level thresholds are calculated in the database so a client cannot choose its level.
3. Security
- Revoke public and anon function execution.
- Grant the function only to authenticated users.
*/

REVOKE ALL ON public.cozy_profile FROM authenticated;
GRANT SELECT ON public.cozy_profile TO authenticated;
GRANT UPDATE (display_name, avatar) ON public.cozy_profile TO authenticated;

CREATE OR REPLACE FUNCTION public.add_cozy_xp(p_delta integer)
RETURNS TABLE(new_xp integer, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_xp integer;
  updated_level integer;
BEGIN
  IF p_delta IS NULL OR p_delta < -20 OR p_delta > 20 THEN
    RAISE EXCEPTION 'Invalid progression change';
  END IF;

  UPDATE public.cozy_profile
  SET xp = GREATEST(0, xp + p_delta),
      level = CASE
        WHEN GREATEST(0, xp + p_delta) >= 350 THEN 5
        WHEN GREATEST(0, xp + p_delta) >= 220 THEN 4
        WHEN GREATEST(0, xp + p_delta) >= 120 THEN 3
        WHEN GREATEST(0, xp + p_delta) >= 50 THEN 2
        ELSE 1
      END,
      updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING xp, level INTO updated_xp, updated_level;

  IF updated_xp IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  new_xp := updated_xp;
  new_level := updated_level;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_cozy_xp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_cozy_xp(integer) TO authenticated;