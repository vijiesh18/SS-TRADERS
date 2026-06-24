"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/use-auth";
import {
  Paintbrush, Loader2, Eye, EyeOff, Mail, Lock,
  Shield, Zap, BarChart3, Settings2,
} from "lucide-react";

/* ── Forgot Password Modal ───────────────────────────────── */
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(44,40,32,0.55)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: "#faf7f2", borderRadius: 20,
        border: "1px solid rgba(180,155,110,0.3)",
        boxShadow: "0 24px 64px rgba(100,80,40,0.2)",
        padding: "36px 40px", width: "100%", maxWidth: 420,
        position: "relative",
      }} onClick={(e) => e.stopPropagation()}>

        {/* Top accent */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,#6b7c45,#c47a3a,transparent)", borderRadius:"20px 20px 0 0" }} />

        {!sent ? (
          <>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ width:48, height:48, background:"linear-gradient(135deg,#6b7c45,#8fa05a)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <Lock size={20} color="#fff" />
              </div>
              <div style={{ fontSize:20, fontWeight:700, color:"#2c2418", fontFamily:"Georgia,serif" }}>Forgot Password?</div>
              <div style={{ fontSize:13, color:"#a8937a", marginTop:6, lineHeight:1.5 }}>
                Enter your email address and we'll send you a reset link.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#6b5d4a", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.8px" }}>
                Email Address
              </label>
              <div style={{ position:"relative", marginBottom:20 }}>
                <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#a8937a" }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  style={{ width:"100%", padding:"11px 14px 11px 38px", background:"rgba(245,240,232,0.9)", border:"1px solid rgba(180,155,110,0.35)", borderRadius:10, fontSize:14, color:"#2c2418", outline:"none", boxSizing:"border-box" }}
                  onFocus={(e) => { e.target.style.borderColor="#6b7c45"; e.target.style.boxShadow="0 0 0 3px rgba(107,124,69,0.12)"; }}
                  onBlur={(e)  => { e.target.style.borderColor="rgba(180,155,110,0.35)"; e.target.style.boxShadow="none"; }}
                />
              </div>

              {error && (
                <div style={{ background:"rgba(192,85,42,0.08)", border:"1px solid rgba(192,85,42,0.25)", borderRadius:8, padding:"9px 13px", fontSize:13, color:"#8a2a10", marginBottom:16 }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width:"100%", padding:"12px", background:"linear-gradient(135deg,#6b7c45,#8fa05a)",
                color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow:"0 4px 14px rgba(107,124,69,0.35)",
              }}>
                {loading ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Sending…</> : "Send Reset Link →"}
              </button>

              <button type="button" onClick={onClose} style={{ width:"100%", marginTop:10, padding:"10px", background:"transparent", border:"1px solid rgba(180,155,110,0.3)", borderRadius:10, fontSize:13, color:"#6b5d4a", cursor:"pointer", fontWeight:500 }}>
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:"8px 0" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#2c2418", fontFamily:"Georgia,serif", marginBottom:10 }}>Check Your Email</div>
            <div style={{ fontSize:13, color:"#6b5d4a", lineHeight:1.7, marginBottom:24 }}>
              We've sent a password reset link to<br />
              <strong style={{ color:"#6b7c45" }}>{email}</strong><br />
              The link expires in 1 hour.
            </div>
            <div style={{ fontSize:12, color:"#a8937a", background:"rgba(180,155,110,0.1)", borderRadius:10, padding:"10px 14px", marginBottom:20 }}>
              💡 Didn't get it? Check your spam folder.
            </div>
            <button onClick={onClose} style={{ padding:"11px 28px", background:"linear-gradient(135deg,#6b7c45,#8fa05a)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              Back to Login
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Feature pill ────────────────────────────────────────── */
function Feature({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, textAlign:"center" }}>
      <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={18} color="rgba(255,255,255,0.9)" />
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.95)" }}>{title}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", lineHeight:1.4 }}>{sub}</div>
    </div>
  );
}

/* ── Main Login Page ─────────────────────────────────────── */
export default function LoginPage() {
  const router   = useRouter();
  const login    = useLogin();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid email or password");
    }
  }

  return (
    <>
      {/* Warm ambient blobs */}
      <div className="glass-scene" aria-hidden="true">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
      </div>
      <div className="paint-grid" aria-hidden="true" />

      <div style={{ minHeight:"100vh", display:"flex", position:"relative", zIndex:1 }}>

        {/* ── LEFT PANEL — brand ─────────────────────────── */}
        <div style={{
          width: "52%",
          background: "linear-gradient(145deg, #3d4d28 0%, #6b7c45 45%, #8fa05a 100%)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
        }}>
          {/* Background paint strokes */}
          <div style={{ position:"absolute", top:-80, right:-80, width:400, height:400, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-60, left:-60, width:300, height:300, borderRadius:"50%", background:"rgba(196,122,58,0.12)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:"30%", right:"10%", width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />

          {/* Brush stroke decorative lines */}
          <div style={{ position:"absolute", top:0, right:0, bottom:0, width:3, background:"linear-gradient(180deg,transparent,rgba(255,255,255,0.15),transparent)" }} />

          {/* Logo top */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:64 }}>
              <div style={{ width:44, height:44, background:"rgba(255,255,255,0.18)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,255,255,0.25)" }}>
                <Paintbrush size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>S.S Traders</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", letterSpacing:"0.5px" }}>Smart POS</div>
              </div>
            </div>

            {/* Tagline */}
            <div>
              <div style={{ fontSize:11, color:"rgba(196,122,58,0.9)", textTransform:"uppercase", letterSpacing:"2px", fontWeight:700, marginBottom:16 }}>
                ✦ Nagercoil, Tamil Nadu
              </div>
              <h1 style={{ fontSize:38, fontWeight:800, color:"#fff", lineHeight:1.2, letterSpacing:"-1px", margin:"0 0 16px", fontFamily:"Georgia,serif" }}>
                Simplify Billing.<br />
                <span style={{ color:"rgba(245,220,150,0.95)" }}>Elevate Your</span><br />
                Business.
              </h1>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.70)", lineHeight:1.7, margin:0, maxWidth:320 }}>
                Smart, Fast & Reliable Billing for Modern Businesses. Manage inventory, GST, and credits — all in one place.
              </p>
            </div>
          </div>

          {/* Business lines */}
          <div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:40 }}>
              {["Paint Shop", "Motors", "Borewell", "Hardware"].map((b) => (
                <span key={b} style={{ padding:"5px 14px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:999, fontSize:12, color:"rgba(255,255,255,0.85)", fontWeight:500 }}>
                  {b}
                </span>
              ))}
            </div>

            {/* Feature pills */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <Feature icon={Shield}   title="Secure"    sub="& Reliable"       />
              <Feature icon={Zap}      title="Fast"      sub="Performance"      />
              <Feature icon={BarChart3}title="Insightful"sub="Reports"          />
              <Feature icon={Settings2}title="Smart"     sub="Management"       />
            </div>
          </div>

          {/* Bottom credit */}
          <div style={{ position:"absolute", bottom:20, left:52, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
            © 2026 S.S Traders Smart POS · Designed & Curated by Vijiesh 🌿
          </div>
        </div>

        {/* ── RIGHT PANEL — form ─────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 52px",
          background: "rgba(245,240,232,0.6)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ width:"100%", maxWidth:400 }} className="anim-scale-in">

            {/* Form header */}
            <div style={{ marginBottom:36 }}>
              <div style={{ width:52, height:52, background:"linear-gradient(135deg,#6b7c45,#8fa05a)", borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, boxShadow:"0 6px 20px rgba(107,124,69,0.35)" }}>
                <Paintbrush size={22} color="#fff" />
              </div>
              <h2 style={{ fontSize:26, fontWeight:800, color:"#2c2418", letterSpacing:"-0.5px", margin:"0 0 6px", fontFamily:"Georgia,serif" }}>
                Welcome Back!
              </h2>
              <p style={{ fontSize:13, color:"#a8937a", margin:0, fontWeight:500 }}>
                Sign in to continue to your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom:18 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#6b5d4a", marginBottom:7 }}>
                  Email
                </label>
                <div style={{ position:"relative" }}>
                  <Mail size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#a8937a", pointerEvents:"none" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sstraders.com"
                    required
                    autoComplete="email"
                    style={{
                      width:"100%", padding:"12px 14px 12px 40px",
                      background:"rgba(250,247,242,0.95)",
                      border:"1px solid rgba(180,155,110,0.35)",
                      borderRadius:10, fontSize:14, color:"#2c2418",
                      outline:"none", boxSizing:"border-box",
                      transition:"border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor="#6b7c45"; e.target.style.boxShadow="0 0 0 3px rgba(107,124,69,0.12)"; }}
                    onBlur={(e)  => { e.target.style.borderColor="rgba(180,155,110,0.35)"; e.target.style.boxShadow="none"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#6b5d4a", marginBottom:7 }}>
                  Password
                </label>
                <div style={{ position:"relative" }}>
                  <Lock size={15} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"#a8937a", pointerEvents:"none" }} />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width:"100%", padding:"12px 44px 12px 40px",
                      background:"rgba(250,247,242,0.95)",
                      border:"1px solid rgba(180,155,110,0.35)",
                      borderRadius:10, fontSize:14, color:"#2c2418",
                      outline:"none", boxSizing:"border-box",
                      transition:"border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor="#6b7c45"; e.target.style.boxShadow="0 0 0 3px rgba(107,124,69,0.12)"; }}
                    onBlur={(e)  => { e.target.style.borderColor="rgba(180,155,110,0.35)"; e.target.style.boxShadow="none"; }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#a8937a", padding:3 }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:24 }}>
                <button type="button" onClick={() => setShowForgot(true)} style={{ background:"none", border:"none", fontSize:12, color:"#c47a3a", cursor:"pointer", fontWeight:600, padding:0, textDecoration:"underline", textDecorationColor:"rgba(196,122,58,0.35)" }}>
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background:"rgba(192,85,42,0.08)", border:"1px solid rgba(192,85,42,0.25)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#8a2a10", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={login.isPending} style={{
                width:"100%", padding:"13px", fontSize:15, fontWeight:700,
                background: login.isPending ? "rgba(107,124,69,0.5)" : "linear-gradient(135deg,#4a5e28,#6b7c45)",
                color:"#fff", border:"none", borderRadius:10, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow: login.isPending ? "none" : "0 6px 20px rgba(107,124,69,0.40)",
                transition:"all 0.2s", letterSpacing:"0.2px",
              }}>
                {login.isPending
                  ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> Signing in…</>
                  : "Sign In →"}
              </button>
            </form>

            {/* Footer */}
            <div style={{ marginTop:28, textAlign:"center", fontSize:12, color:"#c0a882", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Lock size={12} />
              Secure & trusted login
            </div>
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
