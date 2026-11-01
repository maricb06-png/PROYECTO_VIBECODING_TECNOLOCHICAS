/*
# Add dated habit history, profile progress, garden stages, and weekly reflections

1. New tables
- `cozy_habit_completions`: one row per habit and local calendar date, preventing duplicate daily entries.
- `cozy_profile`: the single-tenant profile, XP, level, display name, and avatar.
- `cozy_reflections`: one editable reflection per calendar week with guided prompts.
2. Security
- RLS is enabled on all new tables.
- The existing no-sign-in single-tenant app receives separate CRUD policies for anon and authenticated roles.
3. Progress notes
- Existing habits remain intact; their old daily boolean is not removed for compatibility.
- The application now treats `cozy_habit_completions.completed_on` as the source of truth for dated history.
*/

CREATE TABLE IF NOT EXISTS public.cozy_habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.cozy_habits(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_on)
);

CREATE TABLE IF NOT EXISTS public.cozy_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL DEFAULT 'Mara',
  avatar text NOT NULL DEFAULT 'M',
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cozy_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key date NOT NULL UNIQUE,
  achieved text NOT NULL DEFAULT '',
  difficult text NOT NULL DEFAULT '',
  learned text NOT NULL DEFAULT '',
  improve text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cozy_habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cozy_reflections ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_habit_completions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_profile TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cozy_reflections TO anon, authenticated;

DROP POLICY IF EXISTS "workspace_read_habit_completions" ON public.cozy_habit_completions;
CREATE POLICY "workspace_read_habit_completions" ON public.cozy_habit_completions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_habit_completions" ON public.cozy_habit_completions;
CREATE POLICY "workspace_insert_habit_completions" ON public.cozy_habit_completions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_habit_completions" ON public.cozy_habit_completions;
CREATE POLICY "workspace_update_habit_completions" ON public.cozy_habit_completions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_habit_completions" ON public.cozy_habit_completions;
CREATE POLICY "workspace_delete_habit_completions" ON public.cozy_habit_completions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_read_profile" ON public.cozy_profile;
CREATE POLICY "workspace_read_profile" ON public.cozy_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_profile" ON public.cozy_profile;
CREATE POLICY "workspace_insert_profile" ON public.cozy_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_profile" ON public.cozy_profile;
CREATE POLICY "workspace_update_profile" ON public.cozy_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_profile" ON public.cozy_profile;
CREATE POLICY "workspace_delete_profile" ON public.cozy_profile FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workspace_read_reflections" ON public.cozy_reflections;
CREATE POLICY "workspace_read_reflections" ON public.cozy_reflections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_reflections" ON public.cozy_reflections;
CREATE POLICY "workspace_insert_reflections" ON public.cozy_reflections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_reflections" ON public.cozy_reflections;
CREATE POLICY "workspace_update_reflections" ON public.cozy_reflections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_reflections" ON public.cozy_reflections;
CREATE POLICY "workspace_delete_reflections" ON public.cozy_reflections FOR DELETE TO anon, authenticated USING (true);