import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigins = new Set(["https://bvssfvm.com", "https://www.bvssfvm.com"]);

function cors(origin: string | null) {
  const allow = origin && allowedOrigins.has(origin) ? origin : "https://bvssfvm.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return response(origin, { error: "method_not_allowed" }, 405);
  if (origin && !allowedOrigins.has(origin)) return response(origin, { error: "origin_not_allowed" }, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return response(origin, { error: "server_configuration_error" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return response(origin, { error: "invalid_request" }, 400);
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || token.length < 32) return response(origin, { error: "invalid_or_expired_setup_link" }, 400);
  if (password.length < 12 || password.length > 128) {
    return response(origin, { error: "password_must_be_12_to_128_characters" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256Hex(token);

  const { data: setup, error: setupError } = await admin
    .from("bvss_admin_password_setup_tokens")
    .select("token_hash,user_id,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (setupError) return response(origin, { error: "setup_lookup_failed" }, 500);
  if (!setup || setup.used_at || new Date(setup.expires_at).getTime() <= Date.now()) {
    return response(origin, { error: "invalid_or_expired_setup_link" }, 400);
  }

  const { data: adminRow } = await admin
    .from("bvss_admin_users")
    .select("role")
    .eq("user_id", setup.user_id)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRow) return response(origin, { error: "admin_access_required" }, 403);

  const { error: passwordError } = await admin.auth.admin.updateUserById(setup.user_id, {
    password,
  });
  if (passwordError) return response(origin, { error: "password_update_failed" }, 500);

  const { error: consumeError } = await admin
    .from("bvss_admin_password_setup_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("used_at", null);
  if (consumeError) return response(origin, { error: "setup_completion_failed" }, 500);

  return response(origin, { ok: true });
});