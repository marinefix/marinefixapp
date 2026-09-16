interface Env { DB: D1Database; ADMIN_SECRET: string; }
type AnalyticsEvent = "visit" | "session" | "install";
type Platform = "web" | "android";
function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
function validId(v: unknown): v is string { return typeof v === "string" && v.length >= 8 && v.length <= 100; }
function validPath(v: unknown): v is string { return typeof v === "string" && v.length <= 200; }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json<{ visitor_id?: string; platform?: Platform; event?: AnalyticsEvent; path?: string }>();
    if (!validId(body.visitor_id) || (body.platform !== "web" && body.platform !== "android") || (body.event !== "visit" && body.event !== "session" && body.event !== "install") || !validPath(body.path)) return json({ success: false }, 400);
    if (body.event === "install" && body.platform !== "android") return json({ success: false }, 400);
    await env.DB.prepare(`INSERT INTO analytics_events (id, visitor_id, platform, event, path) VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), body.visitor_id, body.platform, body.event, body.path).run();
    return json({ success: true });
  } catch (error) { console.error("Analytics POST failed:", error); return json({ success: false }, 500); }
};

async function verifyAdminToken(request: Request, secret: string): Promise<boolean> {
  if (!secret) return false;
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)marinefix_admin=([^;]+)/); if (!match) return false;
  const [timestamp, signature] = match[1].split("."); const tokenTime = Number(timestamp);
  if (!timestamp || !signature || !Number.isFinite(tokenTime) || Date.now() - tokenTime > 8 * 60 * 60 * 1000 || Date.now() - tokenTime < 0) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const bytes = new Uint8Array(signature.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []); if (bytes.length !== 32) return false;
    return await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(timestamp));
  } catch { return false; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await verifyAdminToken(request, env.ADMIN_SECRET))) return json({ success: false, error: "Unauthorized" }, 401);
  try {
    const [totals, recent, daily] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN platform='web' THEN visitor_id END) AS web_visitors, COUNT(DISTINCT CASE WHEN platform='android' THEN visitor_id END) AS app_users, COUNT(CASE WHEN event='install' THEN 1 END) AS app_first_launches, COUNT(CASE WHEN event='session' THEN 1 END) AS total_sessions FROM analytics_events`).first(),
      env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN platform='web' THEN visitor_id END) AS web_visitors, COUNT(DISTINCT CASE WHEN platform='android' THEN visitor_id END) AS app_users, COUNT(CASE WHEN event='install' THEN 1 END) AS app_first_launches, COUNT(CASE WHEN event='session' THEN 1 END) AS sessions FROM analytics_events WHERE created_at >= datetime('now','-30 days')`).first(),
      env.DB.prepare(`SELECT date(created_at) AS day, COUNT(DISTINCT visitor_id) AS unique_users, COUNT(CASE WHEN platform='web' THEN 1 END) AS web_sessions, COUNT(CASE WHEN platform='android' THEN 1 END) AS app_sessions FROM analytics_events WHERE event='session' AND created_at >= datetime('now','-30 days') GROUP BY date(created_at) ORDER BY day DESC`).all(),
    ]);
    return json({ success: true, totals, recent30Days: recent, daily: daily.results });
  } catch (error) { console.error("Analytics GET failed:", error); return json({ success: false, error: "Failed to load analytics" }, 500); }
};
