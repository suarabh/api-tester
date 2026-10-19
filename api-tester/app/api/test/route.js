export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST = "api.koenig-solutions.com";

export async function GET(req) {
  const target = new URL(req.url).searchParams.get("url") || `https://${ALLOWED_HOST}/`;
  let u;
  try { u = new URL(target); } catch { return Response.json({ error: "Invalid URL" }, { status: 400 }); }
  if (u.protocol !== "https:" || u.hostname !== ALLOWED_HOST)
    return Response.json({ error: `Only https://${ALLOWED_HOST} is allowed` }, { status: 400 });

  // Vercel's outbound IP as seen from the internet (varies per request unless Static IPs is on)
  let outboundIp = "unknown";
  try { outboundIp = (await (await fetch("https://api.ipify.org?format=json")).json()).ip; } catch {}

  const headers = {};
  if (process.env.API_KEY) headers["X-Api-Key"] = process.env.API_KEY; // optional, server-side only

  const start = Date.now();
  try {
    const r = await fetch(u.toString(), { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const body = (await r.text()).slice(0, 300);
    return Response.json({ ok: r.ok, status: r.status, ms: Date.now() - start, outboundIp, usedApiKey: !!process.env.API_KEY, snippet: body });
  } catch (e) {
    return Response.json({ ok: false, status: 0, ms: Date.now() - start, outboundIp, error: String(e.message || e) });
  }
}
