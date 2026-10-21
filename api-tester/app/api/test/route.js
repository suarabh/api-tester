import https from "node:https";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST = "api.koenig-solutions.com";
const PINNED_IP = "20.207.116.38"; // same as hosts entry: 20.207.116.38 api.koenig-solutions.com

// Connects to PINNED_IP but keeps Host header, SNI and TLS certificate check
// for api.koenig-solutions.com (equivalent to curl --resolve).
function requestViaPinnedIp(u, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: ALLOWED_HOST,
        port: 443,
        path: u.pathname + u.search,
        method: "GET",
        headers: { Host: ALLOWED_HOST, ...headers },
        servername: ALLOWED_HOST,
        timeout: 15000,
        lookup: (_host, options, cb) =>
          options && options.all
            ? cb(null, [{ address: PINNED_IP, family: 4 }])
            : cb(null, PINNED_IP, 4),
      },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          if (size < 300) chunks.push(c);
          size += c.length;
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            connectedIp: res.socket?.remoteAddress || "unknown",
            snippet: Buffer.concat(chunks).toString("utf8").slice(0, 300),
          })
        );
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

export async function GET(req) {
  const target =
    new URL(req.url).searchParams.get("url") || `https://${ALLOWED_HOST}/`;

  let u;
  try {
    u = new URL(target);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (
    u.protocol !== "https:" ||
    u.hostname !== ALLOWED_HOST ||
    (u.port && u.port !== "443") ||
    u.username ||
    u.password
  ) {
    return Response.json(
      { error: `Only https://${ALLOWED_HOST} is allowed` },
      { status: 400 }
    );
  }

  // Vercel's own outbound (source) IP. This is the IP the IIS whitelist sees.
  let vercelOutboundIp = "unknown";
  try {
    const r = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) vercelOutboundIp = (await r.json()).ip || "unknown";
  } catch {}

  const headers = {};
  if (process.env.API_KEY) headers["X-Api-Key"] = process.env.API_KEY;

  const start = Date.now();
  try {
    const r = await requestViaPinnedIp(u, headers);
    return Response.json({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      ms: Date.now() - start,
      pinnedIp: PINNED_IP,
      connectedIp: r.connectedIp,
      routedViaPinnedIp: r.connectedIp === PINNED_IP,
      vercelOutboundIp, // add this to the IIS whitelist if you get 403
      usedApiKey: !!process.env.API_KEY,
      snippet: r.snippet,
    });
  } catch (e) {
    return Response.json({
      ok: false,
      status: 0,
      ms: Date.now() - start,
      pinnedIp: PINNED_IP,
      vercelOutboundIp,
      error: String(e.message || e),
    });
  }
}
