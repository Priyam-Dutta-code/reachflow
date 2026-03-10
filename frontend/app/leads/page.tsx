"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: "rgba(255,255,255,0.4)",  bg: "rgba(255,255,255,0.06)" },
  sent:    { color: "#60a5fa",                bg: "rgba(96,165,250,0.12)"  },
  replied: { color: "#34d399",                bg: "rgba(52,211,153,0.12)"  },
  bounced: { color: "#f87171",                bg: "rgba(248,113,113,0.12)" },
};
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 11, padding: "10px 13px", fontSize: 13, color: "#e8e8f0",
  outline: "none", fontFamily: "DM Sans, sans-serif",
};

export default function LeadsPage() {
  const [leads,      setLeads]      = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [status,     setStatus]     = useState("");
  const [generating, setGen]        = useState(false);
  const [apiError,   setApiError]   = useState("");
  const [genMsg,     setGenMsg]     = useState("");
  const [form, setForm] = useState({ source: "google_maps", query: "", location: "", max: 50 });
  const { session } = useAuth();

  const load = async (p = 1, s = status) => {
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "50" });
      if (s) params.set("status", s);
      const d = await apiFetch(`/api/leads/?${params}`);
      setLeads(d.leads ?? []); setTotal(d.total ?? 0);
      setApiError("");
    } catch (e: any) {
      setApiError(e.message);
    }
  };

  useEffect(() => { if (session) load(); }, [session]);

  const generate = async () => {
    if (!form.query.trim()) return;
    setGen(true); setGenMsg("Scraping in background — refreshing in 5 seconds…");
    try {
      await apiFetch("/api/leads/generate", { method: "POST", body: JSON.stringify(form) });
      setTimeout(() => { load(); setGen(false); setGenMsg(""); }, 5000);
    } catch (e: any) {
      setApiError(e.message); setGen(false); setGenMsg("");
    }
  };

  const filterBy = (s: string) => { setStatus(s); setPage(1); load(1, s); };

  return (
    <Shell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>Leads</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{total.toLocaleString()} total leads</p>
      </div>

      {apiError && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: 13 }}>
          ⚠ {apiError} — Check that the backend is running and your <code>SUPABASE_URL</code> is set in <code>.env</code>
        </div>
      )}

      {/* Generate form */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: 22, marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 14, fontWeight: 500 }}>Generate New Leads</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ ...inp, cursor: "pointer", minWidth: 160 }}>
            <option value="google_maps">Google Maps</option>
            <option value="linkedin">LinkedIn</option>
            <option value="apollo">Apollo.io</option>
            <option value="job_portal">Job Portals</option>
          </select>
          <input placeholder="Query — e.g. HR Manager" value={form.query} onChange={e => setForm({ ...form, query: e.target.value })} style={{ ...inp, flex: 1, minWidth: 160 }} />
          <input placeholder="Location — e.g. Bangalore" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ ...inp, flex: 1, minWidth: 140 }} />
          <button onClick={generate} disabled={generating || !form.query.trim()} style={{ padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif", opacity: generating || !form.query.trim() ? 0.5 : 1 }}>
            {generating ? "Running…" : "Generate →"}
          </button>
        </div>
        {genMsg && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>{genMsg}</p>}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["", "pending", "sent", "replied", "bounced"].map(s => (
          <button key={s} onClick={() => filterBy(s)} style={{ padding: "6px 14px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif", background: status === s ? "#7c3aed" : "rgba(255,255,255,0.06)", color: status === s ? "#fff" : "rgba(255,255,255,0.4)" }}>
            {s === "" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Name", "Company", "Email", "Title", "Location", "Status", "Source"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 500 }}>{l.name || "—"}</td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.6)" }}>{l.company || "—"}</td>
                  <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 12 }}>
                    {l.email ? <span style={{ color: "rgba(255,255,255,0.5)" }}>{l.email}</span> : <span style={{ color: "rgba(248,113,113,0.6)" }}>no email</span>}
                  </td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.45)" }}>{l.title || "—"}</td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{l.location || "—"}</td>
                  <td style={{ padding: "11px 16px" }}>
                    {(() => { const st = STATUS_STYLE[l.status] ?? STATUS_STYLE.pending; return <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99, background: st.bg, color: st.color }}>{l.status}</span>; })()}
                  </td>
                  <td style={{ padding: "11px 16px", color: "rgba(255,255,255,0.22)", fontSize: 12 }}>{(l.source || "").replace(/_/g, " ")}</td>
                </tr>
              ))}
              {!leads.length && (
                <tr><td colSpan={7} style={{ padding: "60px 20px", textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 14 }}>
                  {apiError ? "Could not load leads — see error above." : "No leads yet. Generate some above."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 50 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>Showing {(page-1)*50+1}–{Math.min(page*50, total)} of {total}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setPage(page-1); load(page-1); }} disabled={page===1} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", opacity: page===1 ? 0.3 : 1 }}>← Prev</button>
              <button onClick={() => { setPage(page+1); load(page+1); }} disabled={page*50>=total} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", opacity: page*50>=total ? 0.3 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
