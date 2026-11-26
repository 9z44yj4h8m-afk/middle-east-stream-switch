ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_approved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_profile_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.suspended IS DISTINCT FROM false OR NEW.library_approved IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'Forbidden';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.suspended IS DISTINCT FROM OLD.suspended OR NEW.library_approved IS DISTINCT FROM OLD.library_approved THEN
        RAISE EXCEPTION 'Forbidden';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_suspension ON public.profiles;
CREATE TRIGGER protect_profile_suspension
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_suspension();

CREATE TABLE IF NOT EXISTS public.library_pin_attempts (
  user_id uuid PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.library_pin_attempts TO service_role;
REVOKE ALL ON public.library_pin_attempts FROM PUBLIC, anon, authenticated;
ALTER TABLE public.library_pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_set_library_approved(p_user uuid, p_approved boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.profiles SET library_approved = p_approved WHERE user_id = p_user;
  IF NOT p_approved THEN
    UPDATE public.member_library_sessions SET unlocked = false WHERE user_id = p_user AND unlocked;
  END IF;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_library_approved(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_library_approved(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlock_member_library(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sid text := auth.jwt()->>'session_id';
  v_pin text;
  v_is_admin boolean;
  v_entitled boolean;
  v_attempts integer;
  v_locked_until timestamptz;
BEGIN
  IF v_uid IS NULL OR v_sid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin');
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = v_uid AND NOT suspended AND library_approved
    ) INTO v_entitled;
    IF NOT v_entitled THEN
      RAISE EXCEPTION 'subscription_required';
    END IF;
  END IF;

  SELECT failed_count, locked_until INTO v_attempts, v_locked_until
  FROM public.library_pin_attempts
  WHERE user_id = v_uid;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;

  PERFORM pg_sleep(0.4);

  SELECT value INTO v_pin FROM public.private_settings WHERE key = 'library_pin';
  IF p_pin IS DISTINCT FROM coalesce(v_pin, '0550') THEN
    v_attempts := coalesce(v_attempts, 0) + 1;
    INSERT INTO public.library_pin_attempts (user_id, failed_count, locked_until, updated_at)
    VALUES (
      v_uid,
      CASE WHEN v_attempts >= 5 THEN 0 ELSE v_attempts END,
      CASE WHEN v_attempts >= 5 THEN now() + interval '30 minutes' ELSE NULL END,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      failed_count = EXCLUDED.failed_count,
      locked_until = EXCLUDED.locked_until,
      updated_at = now();
    RETURN false;
  END IF;

  DELETE FROM public.library_pin_attempts WHERE user_id = v_uid;

  INSERT INTO public.member_library_sessions (session_id, user_id, unlocked, entered_at)
  VALUES (v_sid, v_uid, true, now())
  ON CONFLICT (session_id) DO UPDATE SET unlocked = true, entered_at = now();

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unlock_member_library(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_member_library(text) TO authenticated;

DROP POLICY IF EXISTS "Members read current library session" ON public.member_library_sessions;
CREATE POLICY "Members read current library session"
  ON public.member_library_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND session_id = (auth.jwt() ->> 'session_id'::text)
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.library_approved
          AND NOT p.suspended
      )
    )
  );

REVOKE EXECUTE ON FUNCTION public.get_my_chat_ban(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_room_move(text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_my_chat_ban(p_name text DEFAULT NULL)
RETURNS TABLE(name text, kind text, until timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.name, b.kind, b.until
  FROM public.profiles p
  JOIN public.chat_bans b
    ON lower(btrim(b.name)) = lower(btrim(p.display_name))
  WHERE p.user_id = auth.uid()
    AND length(btrim(coalesce(p.display_name, ''))) > 0
    AND (b.until IS NULL OR b.until > now())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_room_move(p_name text DEFAULT NULL)
RETURNS TABLE(room_id uuid, moved_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.room_id, m.moved_at
  FROM public.profiles p
  JOIN public.chat_room_moves m
    ON m.name = btrim(p.display_name)
  WHERE p.user_id = auth.uid()
    AND length(btrim(coalesce(p.display_name, ''))) > 0
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_chat_ban(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_room_move(text) TO authenticated;