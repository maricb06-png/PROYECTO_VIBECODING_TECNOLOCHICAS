/*
# Enable private multi-user Cozy Life workspaces

1. Ownership columns
- Add nullable `user_id` UUID columns to every existing Cozy Life table so legacy rows are preserved without being deleted.
- New rows default `user_id` to the authenticated Supabase user.
- Habit completion rows also carry their owner's ID for direct row-level checks.
2. New-user profile setup
- Add a trigger function that creates a level-1 profile with 0 XP after a user registers.
- The display name comes from signup metadata only as initial profile content, never as an authorization signal.
3. Security
- Remove the previous shared anon policies from all private tables.
- Enable authenticated-only CRUD policies scoped to `auth.uid()` for every table.
- Revoke Data API access for anon and grant only the authenticated role.
- Revoke direct client writes to ownership columns; the database supplies them from the session.
4. Legacy data
- Existing rows remain in place with a NULL owner until the original owner account is known and can be assigned safely.
- No account is allowed to claim legacy rows by guessing a display name or email.
*/

ALTER TABLE public.cozy_tasks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cozy_habits ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cozy_notes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cozy_habit_completions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cozy_profile ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cozy_reflections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cozy_tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cozy_habits ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cozy_notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cozy_habit_completions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cozy_profile ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cozy_reflections ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE UNIQUE INDEX IF NOT EXISTS cozy_profile_user_id_key ON public.cozy_profile(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cozy_tasks_user_id_idx ON public.cozy_tasks(user_id);
CREATE INDEX IF NOT EXISTS cozy_habits_user_id_idx ON public.cozy_habits(user_id);
CREATE INDEX IF NOT EXISTS cozy_notes_user_id_idx ON public.cozy_notes(user_id);
CREATE INDEX IF NOT EXISTS cozy_habit_completions_user_id_idx ON public.cozy_habit_completions(user_id);
CREATE INDEX IF NOT EXISTS cozy_reflections_user_id_idx ON public.cozy_reflections(user_id);

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
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_cozy_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_cozy_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_cozy_user();

ALTER TABLE public.cozy_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_reflections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cozy_tasks FROM anon;
REVOKE ALL ON public.cozy_habits FROM anon;
REVOKE ALL ON public.cozy_notes FROM anon;
REVOKE ALL ON public.cozy_habit_completions FROM anon;
REVOKE ALL ON public.cozy_profile FROM anon;
REVOKE ALL ON public.cozy_reflections FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_habit_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_reflections TO authenticated;

DROP POLICY IF EXISTS "workspace_read_tasks" ON public.cozy_tasks;
DROP POLICY IF EXISTS "workspace_insert_tasks" ON public.cozy_tasks;
DROP POLICY IF EXISTS "workspace_update_tasks" ON public.cozy_tasks;
DROP POLICY IF EXISTS "workspace_delete_tasks" ON public.cozy_tasks;
CREATE POLICY "users_read_own_tasks" ON public.cozy_tasks FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_tasks" ON public.cozy_tasks FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_update_own_tasks" ON public.cozy_tasks FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_tasks" ON public.cozy_tasks FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "workspace_read_habits" ON public.cozy_habits;
DROP POLICY IF EXISTS "workspace_insert_habits" ON public.cozy_habits;
DROP POLICY IF EXISTS "workspace_update_habits" ON public.cozy_habits;
DROP POLICY IF EXISTS "workspace_delete_habits" ON public.cozy_habits;
CREATE POLICY "users_read_own_habits" ON public.cozy_habits FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_habits" ON public.cozy_habits FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_update_own_habits" ON public.cozy_habits FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_habits" ON public.cozy_habits FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "workspace_read_notes" ON public.cozy_notes;
DROP POLICY IF EXISTS "workspace_insert_notes" ON public.cozy_notes;
DROP POLICY IF EXISTS "workspace_update_notes" ON public.cozy_notes;
DROP POLICY IF EXISTS "workspace_delete_notes" ON public.cozy_notes;
CREATE POLICY "users_read_own_notes" ON public.cozy_notes FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_notes" ON public.cozy_notes FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_update_own_notes" ON public.cozy_notes FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_notes" ON public.cozy_notes FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "workspace_read_habit_completions" ON public.cozy_habit_completions;
DROP POLICY IF EXISTS "workspace_insert_habit_completions" ON public.cozy_habit_completions;
DROP POLICY IF EXISTS "workspace_update_habit_completions" ON public.cozy_habit_completions;
DROP POLICY IF EXISTS "workspace_delete_habit_completions" ON public.cozy_habit_completions;
CREATE POLICY "users_read_own_habit_completions" ON public.cozy_habit_completions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_habit_completions" ON public.cozy_habit_completions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.cozy_habits WHERE cozy_habits.id = habit_id AND cozy_habits.user_id = (SELECT auth.uid())));
CREATE POLICY "users_update_own_habit_completions" ON public.cozy_habit_completions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_habit_completions" ON public.cozy_habit_completions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "workspace_read_profile" ON public.cozy_profile;
DROP POLICY IF EXISTS "workspace_insert_profile" ON public.cozy_profile;
DROP POLICY IF EXISTS "workspace_update_profile" ON public.cozy_profile;
DROP POLICY IF EXISTS "workspace_delete_profile" ON public.cozy_profile;
CREATE POLICY "users_read_own_profile" ON public.cozy_profile FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_profile" ON public.cozy_profile FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_update_own_profile" ON public.cozy_profile FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_profile" ON public.cozy_profile FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "workspace_read_reflections" ON public.cozy_reflections;
DROP POLICY IF EXISTS "workspace_insert_reflections" ON public.cozy_reflections;
DROP POLICY IF EXISTS "workspace_update_reflections" ON public.cozy_reflections;
DROP POLICY IF EXISTS "workspace_delete_reflections" ON public.cozy_reflections;
CREATE POLICY "users_read_own_reflections" ON public.cozy_reflections FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_insert_own_reflections" ON public.cozy_reflections FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_update_own_reflections" ON public.cozy_reflections FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users_delete_own_reflections" ON public.cozy_reflections FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_cozy_user() FROM PUBLIC, anon, authenticated;