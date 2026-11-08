/*
# Add "Mis cursos" (courses) with private certificate storage

1. New table `cozy_courses`
- One row per course a user is taking or has finished.
- Fields: name, platform, instructor, category, status, start/end dates, total hours,
  progress (0-100), skills (list of tags), course link, certificate (link or uploaded file),
  personal rating (1-5), notes, and a private `xp_awarded` flag.
- `user_id` defaults to the signed-in user so each account only ever owns its own courses.

2. Automatic rules (database triggers)
- A course marked "completado" is always stored at 100% progress.
- `last_progress_at` is refreshed whenever progress or status changes (used for stale-course reminders).
- `updated_at` is refreshed on every change.

3. XP function `apply_course_xp`
- Awards 30 XP when a course becomes completed and removes those 30 XP when it is unmarked.
- Uses `xp_awarded` so repeated saves can never grant XP twice.
- Runs as the owner only for the caller's own course and profile.

4. Certificate storage
- Private bucket `course-certificates`: 5 MB limit, PDF/PNG/JPG/WEBP only, no public access.
- Files are stored under a folder named after the owner's user id; policies allow each user
  to read, upload, replace, and delete only files inside their own folder.

5. Security
- RLS enabled on `cozy_courses` with four owner-scoped policies (select, insert, update, delete).
- Client writes are column-restricted; `xp_awarded` cannot be set from the browser.
- `apply_course_xp` is callable only by signed-in users.
*/

CREATE TABLE IF NOT EXISTS public.cozy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  platform text NOT NULL DEFAULT '' CHECK (char_length(platform) <= 120),
  instructor text NOT NULL DEFAULT '' CHECK (char_length(instructor) <= 120),
  category text NOT NULL DEFAULT 'Otro' CHECK (category IN ('Programación', 'Ciencia de datos', 'Electrónica', 'Idiomas', 'Arte y diseño', 'Escritura', 'Desarrollo personal', 'Otro')),
  status text NOT NULL DEFAULT 'por empezar' CHECK (status IN ('por empezar', 'en curso', 'pausado', 'completado')),
  start_date date,
  end_date date,
  total_hours numeric(6,1) CHECK (total_hours IS NULL OR (total_hours >= 0 AND total_hours <= 10000)),
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  skills text[] NOT NULL DEFAULT '{}' CHECK (cardinality(skills) <= 12),
  course_url text NOT NULL DEFAULT '' CHECK (char_length(course_url) <= 500),
  certificate_url text NOT NULL DEFAULT '' CHECK (char_length(certificate_url) <= 500),
  certificate_path text NOT NULL DEFAULT '' CHECK (char_length(certificate_path) <= 300),
  certificate_name text NOT NULL DEFAULT '' CHECK (char_length(certificate_name) <= 200),
  rating smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 4000),
  xp_awarded boolean NOT NULL DEFAULT false,
  last_progress_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cozy_courses_dates_order CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS cozy_courses_user_id_idx ON public.cozy_courses (user_id);

CREATE OR REPLACE FUNCTION public.cozy_courses_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completado' THEN
    NEW.progress := 100;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.progress IS DISTINCT FROM OLD.progress OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_progress_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cozy_courses_before_write ON public.cozy_courses;
CREATE TRIGGER cozy_courses_before_write
BEFORE INSERT OR UPDATE ON public.cozy_courses
FOR EACH ROW EXECUTE FUNCTION public.cozy_courses_before_write();

ALTER TABLE public.cozy_courses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cozy_courses FROM anon, authenticated;
GRANT SELECT, DELETE ON public.cozy_courses TO authenticated;
GRANT INSERT (name, platform, instructor, category, status, start_date, end_date, total_hours, progress, skills, course_url, certificate_url, certificate_path, certificate_name, rating, notes) ON public.cozy_courses TO authenticated;
GRANT UPDATE (name, platform, instructor, category, status, start_date, end_date, total_hours, progress, skills, course_url, certificate_url, certificate_path, certificate_name, rating, notes) ON public.cozy_courses TO authenticated;

DROP POLICY IF EXISTS "select_own_courses" ON public.cozy_courses;
CREATE POLICY "select_own_courses" ON public.cozy_courses FOR SELECT
  TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_courses" ON public.cozy_courses;
CREATE POLICY "insert_own_courses" ON public.cozy_courses FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "update_own_courses" ON public.cozy_courses;
CREATE POLICY "update_own_courses" ON public.cozy_courses FOR UPDATE
  TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "delete_own_courses" ON public.cozy_courses;
CREATE POLICY "delete_own_courses" ON public.cozy_courses FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.apply_course_xp(p_course_id uuid, p_completed boolean)
RETURNS TABLE(new_xp integer, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_awarded boolean;
  v_xp integer;
  v_level integer;
  c_delta constant integer := 30;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT xp_awarded INTO v_awarded
  FROM public.cozy_courses
  WHERE id = p_course_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  IF v_awarded IS DISTINCT FROM p_completed THEN
    UPDATE public.cozy_courses SET xp_awarded = p_completed WHERE id = p_course_id;

    UPDATE public.cozy_profile
    SET xp = GREATEST(0, xp + CASE WHEN p_completed THEN c_delta ELSE -c_delta END),
        updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING xp INTO v_xp;

    IF v_xp IS NULL THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;

    v_level := CASE
      WHEN v_xp >= 350 THEN 5
      WHEN v_xp >= 220 THEN 4
      WHEN v_xp >= 120 THEN 3
      WHEN v_xp >= 50 THEN 2
      ELSE 1
    END;

    UPDATE public.cozy_profile SET level = v_level WHERE user_id = auth.uid();
  ELSE
    SELECT xp, level INTO v_xp, v_level FROM public.cozy_profile WHERE user_id = auth.uid();
    IF v_xp IS NULL THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
  END IF;

  new_xp := v_xp;
  new_level := v_level;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_course_xp(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_course_xp(uuid, boolean) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-certificates', 'course-certificates', false, 5242880, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "select_own_course_certificates" ON storage.objects;
CREATE POLICY "select_own_course_certificates" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'course-certificates' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "insert_own_course_certificates" ON storage.objects;
CREATE POLICY "insert_own_course_certificates" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'course-certificates' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "update_own_course_certificates" ON storage.objects;
CREATE POLICY "update_own_course_certificates" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'course-certificates' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'course-certificates' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "delete_own_course_certificates" ON storage.objects;
CREATE POLICY "delete_own_course_certificates" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'course-certificates' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
