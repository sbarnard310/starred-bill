// Members' report photos (supabase/reports.sql): the photos sit in a private bucket, so this function, which runs with
// the project's service key, is how we see them and delete them. Every call needs the review token (Keychain
// "starredbill-review") in an x-review-token header; scripts/reports.py makes the calls.
//   GET  ?pending=1      the reports waiting to be checked, each with a link to its photo that works for 30 minutes
//   GET  ?report=<id>    one report's photo link
//   POST {"action":"review","id":…,"status":"used"|"confirmed"|"not-used","note":…}  records our check and deletes its photo
//   POST {"action":"clean"}  deletes the photos of checked reports, of reports over 90 days old and of deleted accounts
// Deployed with JWT checking off, as the token is the check.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "report-photos";
const LINK_SECONDS = 30 * 60;
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function photoLink(path: string | null) {
  if (!path) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  return data ? data.signedUrl : null;
}

Deno.serve(async (req) => {
  const token = req.headers.get("x-review-token") || "";
  const { data: ok } = await db.rpc("review_token_ok", { t: token });
  if (ok !== true) return json({ error: "not allowed" }, 403);
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("pending")) {
    const { data, error } = await db.from("reports").select("*").eq("status", "new").order("created_at");
    if (error) return json({ error: error.message }, 500);
    const rows = await Promise.all((data || []).map(async (r) => ({ ...r, user_id: undefined, photo: await photoLink(r.photo_path) })));
    return json(rows);
  }
  if (req.method === "GET" && url.searchParams.get("report")) {
    const { data, error } = await db.from("reports").select("photo_path").eq("id", url.searchParams.get("report")).maybeSingle();
    if (error || !data) return json({ error: "no such report" }, 404);
    return json({ photo: await photoLink(data.photo_path) });
  }
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (body.action === "review") {
      if (!["used", "confirmed", "not-used"].includes(body.status)) return json({ error: "status must be used, confirmed or not-used" }, 400);
      const { data, error } = await db.from("reports").update({ status: body.status, review_note: body.note ? String(body.note).slice(0, 500) : null, reviewed_at: new Date().toISOString() })
        .eq("id", body.id).select("photo_path").maybeSingle();
      if (error || !data) return json({ error: error ? error.message : "no such report" }, error ? 500 : 404);
      if (data.photo_path) {
        await db.storage.from(BUCKET).remove([data.photo_path]);
        await db.from("reports").update({ photo_path: null }).eq("id", body.id);
      }
      return json({ ok: true, photoDeleted: !!data.photo_path });
    }
    if (body.action !== "clean") return json({ error: "unknown action" }, 400);
    const { data: names, error } = await db.rpc("report_photos_to_clean");
    if (error) return json({ error: error.message }, 500);
    const list = (names || []).map((n: string | { report_photos_to_clean: string }) => typeof n === "string" ? n : n.report_photos_to_clean);
    let removed = 0;
    for (let i = 0; i < list.length; i += 100) {
      const part = list.slice(i, i + 100);
      const { data } = await db.storage.from(BUCKET).remove(part);
      removed += (data || []).length;
      await db.from("reports").update({ photo_path: null }).in("photo_path", part);
    }
    return json({ removed });
  }
  return json({ error: "unknown request" }, 400);
});
