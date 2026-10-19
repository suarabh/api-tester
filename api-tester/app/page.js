"use client";
import { useState } from "react";

const BASE = "https://api.koenig-solutions.com";

export default function Page() {
  const [path, setPath] = useState("/");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const add = (r) => setRows((p) => [{ time: new Date().toLocaleTimeString(), path, ...r }, ...p]);

  async function fromBrowser() {
    setBusy(true);
    const s = Date.now();
    try {
      const r = await fetch(BASE + path);
      add({ source: "Browser", status: r.status, ok: r.ok, ms: Date.now() - s, note: `Origin: ${location.origin}` });
    } catch (e) {
      add({ source: "Browser", status: 0, ok: false, ms: Date.now() - s, note: "Blocked or CORS error. Open DevTools > Network for the real status." });
    }
    setBusy(false);
  }

  async function fromServer() {
    setBusy(true);
    try {
      const d = await (await fetch("/api/test?url=" + encodeURIComponent(BASE + path))).json();
      add({ source: "Vercel server", status: d.status, ok: d.ok, ms: d.ms, note: d.error || `Outbound IP: ${d.outboundIp}${d.usedApiKey ? " (API key sent)" : ""}` });
    } catch (e) {
      add({ source: "Vercel server", status: 0, ok: false, ms: 0, note: String(e) });
    }
    setBusy(false);
  }

  return (
    <main>
      <h1>API access tester</h1>
      <p className="sub">Checks whether <b>{BASE}</b> accepts requests from this Vercel project, from the visitor's browser and from Vercel's server.</p>

      <div className="bar">
        <span className="base">{BASE}</span>
        <input value={path} onChange={(e) => setPath(e.target.value)} aria-label="Path" />
      </div>
      <div className="actions">
        <button onClick={fromBrowser} disabled={busy}>Test from browser</button>
        <button onClick={fromServer} disabled={busy}>Test from Vercel server</button>
        <button className="ghost" onClick={() => setRows([])}>Clear</button>
      </div>

      {rows.length === 0 ? (
        <p className="empty">No results yet. Run a test to see the status code and outbound IP.</p>
      ) : (
        <table>
          <thead><tr><th>Time</th><th>Source</th><th>Path</th><th>Status</th><th>ms</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.time}</td><td>{r.source}</td><td>{r.path}</td>
                <td><span className={r.ok ? "pill ok" : "pill bad"}>{r.status || "failed"}</span></td>
                <td>{r.ms}</td><td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">403 = your IIS whitelist rule blocked the request. Failed with 0 = CORS or network block. Add the "Outbound IP" shown here to the IIS whitelist if server tests fail.</p>
    </main>
  );
}
