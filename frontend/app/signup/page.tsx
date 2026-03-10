"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
  padding: "11px 14px", fontSize: 14, color: "#e8e8f0",
  outline: "none", fontFamily: "DM Sans, sans-serif",
};

export default function SignupPage() {
  const [step,    setStep]    = useState<"account" | "profile">("account");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const router = useRouter();

  const [acc, setAcc] = useState({ name: "", email: "", password: "" });
  const [pro, setPro] = useState({
    sender_name: "", sender_email: "", sender_phone: "",
    sender_linkedin: "", sender_role: "Software Engineer",
    sender_profile: "", gmail_password: "", groq_api_key: "",
  });

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();

    const { data, error: err } = await supabase.auth.signUp({
      email: acc.email,
      password: acc.password,
      options: { data: { name: acc.name } },
    });

    if (err) { setError(err.message); setLoading(false); return; }

    if (!data.session) {
      // Email confirmation required — sign them in immediately instead
      // (works if the user already confirmed, or if they just signed up)
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: acc.email, password: acc.password,
      });

      if (loginErr || !loginData.session) {
        // They genuinely need to confirm email first
        setError("Please check your inbox and click the confirmation link, then come back to log in.");
        setLoading(false);
        return;
      }
      // Session obtained via login
    }

    // Session is active — move to profile step
    setPro(p => ({ ...p, sender_name: acc.name, sender_email: acc.email }));
    setStep("profile");
    setLoading(false);
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await apiFetch("/api/auth/onboard", {
        method: "POST",
        body: JSON.stringify({ name: acc.name, ...pro }),
      });
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const skipProfile = () => router.replace("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#07070d", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "white", marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 14 }}>R</div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16 }}>ReachFlow</span>
          </Link>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6, color: "#e8e8f0" }}>
            {step === "account" ? "Create your account" : "Set up sender profile"}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {step === "account" ? "Free — no credit card needed" : "AI uses this to write personalised emails"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
            {(["account","profile"] as const).map(s => (
              <div key={s} style={{ height: 4, borderRadius: 4, transition: "all 0.2s", background: step === s ? "#7c3aed" : "rgba(255,255,255,0.1)", width: step === s ? 28 : 14 }} />
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13, lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {step === "account" ? (
          <form onSubmit={submitAccount} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Full name" value={acc.name}
              onChange={e => setAcc({ ...acc, name: e.target.value })} required style={inp} autoComplete="name" />
            <input type="email" placeholder="Email address" value={acc.email}
              onChange={e => setAcc({ ...acc, email: e.target.value })} required style={inp} autoComplete="email" />
            <input type="password" placeholder="Password (min 6 chars)" value={acc.password}
              onChange={e => setAcc({ ...acc, password: e.target.value })} required minLength={6} style={inp} autoComplete="new-password" />

            <button type="submit" disabled={loading} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", opacity: loading ? 0.65 : 1, marginTop: 4 }}>
              {loading ? "Creating account…" : "Continue →"}
            </button>

            <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              💡 <strong style={{ color: "rgba(255,255,255,0.6)" }}>Tip:</strong> To skip email confirmation, go to{" "}
              <strong>Supabase → Authentication → Providers → Email</strong> and disable <em>"Confirm email"</em>.
            </div>
          </form>
        ) : (
          <form onSubmit={submitProfile} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Your name" value={pro.sender_name}
                onChange={e => setPro({ ...pro, sender_name: e.target.value })} required style={inp} />
              <input placeholder="Phone (optional)" value={pro.sender_phone}
                onChange={e => setPro({ ...pro, sender_phone: e.target.value })} style={inp} />
            </div>
            <input placeholder="Your role — e.g. Software Engineer" value={pro.sender_role}
              onChange={e => setPro({ ...pro, sender_role: e.target.value })} style={inp} />
            <input placeholder="LinkedIn URL (optional)" value={pro.sender_linkedin}
              onChange={e => setPro({ ...pro, sender_linkedin: e.target.value })} style={inp} />
            <textarea placeholder="Brief background — skills, tech stack, experience (AI uses this)" value={pro.sender_profile}
              onChange={e => setPro({ ...pro, sender_profile: e.target.value })} rows={3}
              style={{ ...inp, resize: "none" }} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>
                Gmail app password — not your real password.{" "}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "none" }}>Generate here →</a>
              </p>
              <input type="password" placeholder="Gmail app password (xxxx xxxx xxxx xxxx)"
                value={pro.gmail_password} onChange={e => setPro({ ...pro, gmail_password: e.target.value })} style={inp} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>
                Groq API key — free AI.{" "}
                <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "none" }}>Get one →</a>
              </p>
              <input placeholder="Groq API key (gsk_...)"
                value={pro.groq_api_key} onChange={e => setPro({ ...pro, groq_api_key: e.target.value })} style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", opacity: loading ? 0.65 : 1, marginTop: 4 }}>
              {loading ? "Saving…" : "Launch ReachFlow →"}
            </button>
            <button type="button" onClick={skipProfile} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.28)", fontSize: 12, cursor: "pointer", padding: 4 }}>
              Skip for now →
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.28)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#a78bfa", textDecoration: "none" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
