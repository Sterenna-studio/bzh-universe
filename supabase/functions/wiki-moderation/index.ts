import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.50.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase Edge Function environment variables.");
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const MAX_REVIEW_NOTE_LENGTH = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROD_ORIGIN = "https://nitro.sterenna.fr";

function acceptedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return PROD_ORIGIN;
  if (origin === PROD_ORIGIN) return origin;

  try {
    const url = new URL(origin);
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function corsHeaders(request) {
  const origin = acceptedOrigin(request);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(request, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(request),
  });
}

function bearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function requireSuperuser(request) {
  const token = bearerToken(request);
  if (!token) return { error: json(request, { error: "Unauthenticated" }, 401) };

  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData?.user || null;
  if (userError || !user) {
    return { error: json(request, { error: "Invalid token" }, 401) };
  }

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, username, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[wiki-moderation] profile lookup failed", profileError.message);
    return { error: json(request, { error: "Authorization lookup failed" }, 500) };
  }

  if (!profile || profile.role !== "superuser") {
    return { error: json(request, { error: "Forbidden" }, 403) };
  }

  return { user, profile };
}

async function listQueues(request, moderator) {
  const [contributionsResult, flaggedResult, recentResult] = await Promise.all([
    service
      .from("contributions")
      .select("id, page_slug, field_key, current_value, proposed_value, status, author_nitro_id, author_nitro, created_at, updated_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(100),
    service
      .from("comments")
      .select("id, page_slug, content, status, flagged_reason, author_nitro_id, author_nitro, author_name, created_at, updated_at")
      .eq("status", "flagged")
      .order("created_at", { ascending: true })
      .limit(100),
    service
      .from("comments")
      .select("id, page_slug, content, status, flagged_reason, author_nitro_id, author_nitro, author_name, created_at, updated_at")
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const firstError = contributionsResult.error || flaggedResult.error || recentResult.error;
  if (firstError) {
    console.error("[wiki-moderation] queue load failed", firstError.message);
    return json(request, { error: "Moderation queues unavailable" }, 500);
  }

  return json(request, {
    moderator: {
      id: moderator.user.id,
      username: moderator.profile.username || "Superuser",
    },
    contributions: contributionsResult.data || [],
    flagged_comments: flaggedResult.data || [],
    recent_comments: recentResult.data || [],
  });
}

async function updateContribution(request, moderator, id, status, reviewerNote) {
  const changes = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: moderator.user.id,
    reviewer_note: status === "rejected" ? reviewerNote || null : null,
  };

  const { data, error } = await service
    .from("contributions")
    .update(changes)
    .eq("id", id)
    .eq("status", "pending")
    .select("id, page_slug, field_key, status, reviewed_at, reviewed_by, reviewer_note")
    .maybeSingle();

  if (error) {
    console.error("[wiki-moderation] contribution update failed", error.message);
    return json(request, { error: "Contribution update failed" }, 500);
  }

  if (!data) return json(request, { error: "Contribution not found or already reviewed" }, 409);
  return json(request, { ok: true, contribution: data });
}

async function updateComment(request, id, targetStatus) {
  let query = service
    .from("comments")
    .update({
      status: targetStatus,
      ...(targetStatus === "visible" ? { flagged_reason: null } : {}),
    })
    .eq("id", id);

  query = targetStatus === "visible"
    ? query.eq("status", "flagged")
    : query.in("status", ["visible", "flagged"]);

  const { data, error } = await query
    .select("id, page_slug, status, flagged_reason, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[wiki-moderation] comment update failed", error.message);
    return json(request, { error: "Comment update failed" }, 500);
  }

  if (!data) return json(request, { error: "Comment not found or already moderated" }, 409);
  return json(request, { ok: true, comment: data });
}

Deno.serve(async (request) => {
  if (!acceptedOrigin(request)) return json(request, { error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const moderator = await requireSuperuser(request);
  if (moderator.error) return moderator.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  const action = String(body?.action || "");
  if (action === "list") return listQueues(request, moderator);

  const id = String(body?.id || "");
  if (!UUID_PATTERN.test(id)) return json(request, { error: "A valid id is required" }, 400);

  if (action === "approve_contribution") {
    return updateContribution(request, moderator, id, "approved", null);
  }

  if (action === "reject_contribution") {
    const reviewerNote = String(body?.reviewer_note || "").trim().slice(0, MAX_REVIEW_NOTE_LENGTH);
    return updateContribution(request, moderator, id, "rejected", reviewerNote);
  }

  if (action === "hide_comment") {
    return updateComment(request, id, "hidden");
  }

  if (action === "clear_comment_flag") {
    return updateComment(request, id, "visible");
  }

  return json(request, { error: "Unknown action" }, 400);
});
