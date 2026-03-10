"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  draft:    { color: "rgba(255,255,255,0.3)",  bg: "rgba(255,255,255,0.06)" },
  active:   { color: "#34d399",                bg: "rgba(52,211,153,0.12)"  },
  paused:   { color: "#fbbf24",                bg: "rgba(251,191,36,0.12)"  },
  complete: { color: "#60a5fa",                bg: "rgba(96,165,250,0.12)"  },
};
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 11, padding: "10px 13px", fontSize: 13, color: "#e8e8f0",
  outline: "none", fontFamily: "DM Sans, sans-serif",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showNew,   setShowNew]   = useState(false);
  const [launching, setLaunching] = useState<number | null>(null);
  const [apiError,  setApiError]  = useState("");
  const [form, setForm] = useState({ name: "", emails_per_day: 50, send_time: "09:00", follow_up_days: 5 });
  const { session } = useAuth();

  const load = async () => {
    try { setCampaigns(await apiFetch("/api/campaigns/")); setApiError(""); }
    catch (e: any) { setApiError(e.message); }
  };

  useEffect(() => { if (session) load(); }, [session]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await apiFetch("/api/campaigns/", { method: "POST", body: JSON.stringify(form) }); setShowNew(false); load(); }
    catch (e: any) { setApiError(e.message); }
  };

  const sendNow = async (id: number) => {
    setLaunching(id);
    try { await apiFetch(`/api/campaigns/${id}/send-now`, { method: "POST" }); load(); }
    catch (e: any) { setApiError(e.message); }
    finally { setLaunching(null); }
  };

  const toggle = async (c: any) => {
    const s = c.status === "active" ? "paused" : "active";
    try { await apiFetch(`/api/campaigns/${c.id}`, { method: "PATCH", body: JSON.stringify({ status: s }) }); load(); }
    catch (e: any) { setApiError(e.message); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    try { await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" }); load(); }
    catch (e: any) { setApiError(e.message); }
  };

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Campaigns</h1>
        <button onClick={() => setShowNew(true)} style={{ padding: "9px 18px", borderRadius: 11, background: "#7c3aed", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
          + New Campaign
        </button>
      </div>

      {apiError && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: 13 }}>
          ⚠ {apiError} — Check <code>SUPABASE_JWT_SECRET</code> in backend <code>.env</code>
        </div>
      )}

      {showNew && (
        <form onSubmit={create} style={{ borderRadius: 18, border: "1px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.06)", padding: 24, marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Campaign</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <input placeholder="Campaign name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                Emails/day <input type="number" value={form.emails_per_day} onChange={e => setForm({ ...form, emails_per_day: +e.target.value })} style={{ ...inp, width: 80 }} />
              </label>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                Send time <input type="time" value={form.send_time} onChange={e => setForm({ ...form, send_time: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                Follow-up after <input type="number" value={form.follow_up_days} onChange={e => setForm({ ...form, follow_up_days: +e.target.value })} style={{ ...inp, width: 70 }} /> days
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" style={{ padding: "9px 20px", borderRadius: 11, background: "#7c3aed", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Create</button>
            <button type="button" onClick={() => setShowNew(false)} style={{ padding: "9px 20px", borderRadius: 11, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {campaigns.map(c => {
          const st       = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
          const pct      = c.total_leads > 0 ? Math.round(c.total_sent / c.total_leads * 100) : 0;
          const replyPct = c.total_sent  > 0 ? ((c.total_replied / c.total_sent) * 100).toFixed(1) : "0";
          return (
            <div key={c.id} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99, background: st.bg, color: st.color }}>{c.status}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                    <span>{c.total_leads} leads</span><span>{c.total_sent} sent</span>
                    <span>{c.total_replied} replied</span><span>{replyPct}% reply rate</span>
                    <span>{c.emails_per_day}/day · {c.send_time}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7c3aed,#4f46e5)", width: `${pct}%`, transition: "width 0.5s" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {c.status !== "complete" && <>
                    <button onClick={() => sendNow(c.id)} disabled={launching === c.id} style={{ padding: "7px 14px", borderRadius: 9, background: "rgba(52,211,153,0.12)", color: "#34d399", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif", opacity: launching === c.id ? 0.5 : 1 }}>
                      {launching === c.id ? "…" : "▶ Send"}
                    </button>
                    <button onClick={() => toggle(c)} style={{ padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                      {c.status === "active" ? "⏸" : "▶"}
                    </button>
                  </>}
                  <button onClick={() => del(c.id)} style={{ padding: "7px 10px", borderRadius: 9, background: "transparent", color: "rgba(248,113,113,0.5)", border: "none", fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        {!campaigns.length && !apiError && (
          <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.07)", padding: 60, textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 14 }}>
            No campaigns yet. Create one above.
          </div>
        )}
      </div>
    </Shell>
  );
}
