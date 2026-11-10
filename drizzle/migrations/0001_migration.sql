DROP POLICY IF EXISTS "Anyone reads chat bans" ON public.chat_bans;
DROP POLICY IF EXISTS "Anyone reads room moves" ON public.chat_room_moves;

CREATE OR REPLACE FUNCTION public.get_my_chat_ban(p_name text)
RETURNS TABLE(name text, kind text, until timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.name, b.kind, b.until FROM public.chat_bans b
  WHERE length(btrim(coalesce(p_name,''))) > 0
    AND lower(btrim(b.name)) = lower(btrim(p_name))
    AND (b.until IS NULL OR b.until > now())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_room_move(p_name text)
RETURNS TABLE(room_id uuid, moved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.room_id, m.moved_at FROM public.chat_room_moves m
  WHERE length(btrim(coalesce(p_name,''))) > 0 AND m.name = btrim(p_name)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_chat_ban(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_room_move(text) TO anon, authenticated;