
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST = "api.koenig-solutions.com";
const EXPECTED_OUTBOUND_IP = "20.207.116.38";

export async function GET(req) {
  const target =
    new URL(req.url).searchParams.get("url") ||
    `https://${ALLOWED_HOST}/`;

  let u;
  try {
    u = new URL(target);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (
    u.protocol !== "https:" ||
    u.hostname !== ALLOWED_HOST ||
    u.port && u.port !== "443" ||
    u.username ||
    u.password
  ) {
    return Response.json(
      { error: `Only https://${ALLOWED_HOST} is allowed` },
      { status: 400 }
    );
  }

  let outboundIp = "unknown";

  try {
    const ipResponse = await fetch(
      "https://api.ipify.org?format=json",
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );

    if (ipResponse.ok) {
      outboundIp = (await ipResponse.json()).ip || "unknown";
    }
  } catch {}

  const headers = {};
  if (process.env.API_KEY) {
    headers["X-Api-Key"] = process.env.API_KEY;
  }

  const start = Date.now();

  try {
    const r = await fetch(u.toString(), {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const body = (await r.text()).slice(0, 300);

    return Response.json({
      ok: r.ok,
      status: r.status,
      ms: Date.now() - start,
      outboundIp,
      expectedOutboundIp: EXPECTED_OUTBOUND_IP,
      outboundIpMatches: outboundIp === EXPECTED_OUTBOUND_IP,
      usedApiKey: !!process.env.API_KEY,
      snippet: body,
    });
  } catch (e) {
    return Response.json({
      ok: false,
      status: 0,
      ms: Date.now() - start,
      outboundIp,
      expectedOutboundIp: EXPECTED_OUTBOUND_IP,
      outboundIpMatches: outboundIp === EXPECTED_OUTBOUND_IP,
      error: String(e.message || e),
    });
  }
}
