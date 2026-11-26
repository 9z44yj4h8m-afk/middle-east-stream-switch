import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ApiAuthResult =
  | { ok: true; userId: string; client: SupabaseClient<Database> }
  | { ok: false; response: Response };

export async function requireApiUser(request: Request): Promise<ApiAuthResult> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  if (!token) {
    return { ok: false, response: Response.json({ error: "سجّل الدخول أولًا للمتابعة." }, { status: 401 }) };
  }
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return { ok: false, response: Response.json({ error: "تعذّر التحقق من الحساب." }, { status: 503 }) };
  }
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) {
    return { ok: false, response: Response.json({ error: "سجّل الدخول مجددًا." }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("suspended")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (profileError) {
    return { ok: false, response: Response.json({ error: "تعذّر التحقق من الحساب." }, { status: 503 }) };
  }
  if (profile?.suspended) {
    return { ok: false, response: Response.json({ error: "هذا الحساب معطّل؛ تواصل مع الإدارة." }, { status: 403 }) };
  }
  return { ok: true, userId: auth.user.id, client };
}