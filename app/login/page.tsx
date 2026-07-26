"use client";

import { useState, useEffect } from "react";
import { supabaseAdmin as supabase } from "../../lib/supabaseAdmin";
import { useRouter } from "next/navigation";
import { Shield, Scissors, Lock, AlertTriangle, Mail, Eye, EyeOff } from "lucide-react";

type LoginType = "admin" | "staff";

// ── Rate limiting (localStorage) ──────────────────
const LOCK_KEY   = "bg_login_lock";
const MAX_TRIES  = 3;
const BASE_MS    = 60_000; // 1 min base

interface LockState { attempts: number; lockUntil: number; lockMs: number; }

function getLock(): LockState {
  try { const r = localStorage.getItem(LOCK_KEY); if (r) return JSON.parse(r); } catch {}
  return { attempts: 0, lockUntil: 0, lockMs: BASE_MS };
}
function saveLock(s: LockState) {
  try { localStorage.setItem(LOCK_KEY, JSON.stringify(s)); } catch {}
}
function recordFail(): { locked: boolean; lockUntil: number; lockDurationMs: number; attemptsLeft: number } {
  const s = getLock();
  s.attempts += 1;
  if (s.attempts >= MAX_TRIES) {
    const dur = s.lockMs;
    s.lockUntil = Date.now() + dur;
    s.lockMs    = dur * 2;   // double for next lockout
    s.attempts  = 0;
    saveLock(s);
    return { locked: true, lockUntil: s.lockUntil, lockDurationMs: dur, attemptsLeft: 0 };
  }
  saveLock(s);
  return { locked: false, lockUntil: 0, lockDurationMs: 0, attemptsLeft: MAX_TRIES - s.attempts };
}
function clearFails() { try { localStorage.removeItem(LOCK_KEY); } catch {} }

// ── Log to Supabase (silently fails if table absent) ──
async function logSecurityEvent(durationMs: number) {
  try {
    await (supabase as any).from("security_events").insert({
      event_type: "brute_force_lockout",
      locked_for_seconds: Math.round(durationMs / 1000),
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("admin");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [lockSecs, setLockSecs]   = useState(0);
  const [attLeft, setAttLeft]     = useState(MAX_TRIES);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Check existing lockout on mount
  useEffect(() => {
    const s = getLock();
    const rem = s.lockUntil - Date.now();
    if (rem > 0) setLockSecs(Math.ceil(rem / 1000));
    setAttLeft(MAX_TRIES - s.attempts);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (lockSecs <= 0) return;
    const t = setInterval(() => setLockSecs(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [lockSecs]);

  function fmtTime(secs: number) {
    if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${secs}s`;
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();

    // Block if locked
    const ls = getLock();
    if (ls.lockUntil > Date.now()) {
      setLockSecs(Math.ceil((ls.lockUntil - Date.now()) / 1000));
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      const result = recordFail();
      if (result.locked) {
        setLockSecs(Math.ceil((result.lockUntil - Date.now()) / 1000));
        setAttLeft(MAX_TRIES);
        setError("");
        await logSecurityEvent(result.lockDurationMs);
      } else {
        setAttLeft(result.attemptsLeft);
        setError(
          result.attemptsLeft === 1
            ? "Incorrect password. 1 attempt left before lockout!"
            : `Incorrect email or password. ${result.attemptsLeft} attempts left.`
        );
      }
      setLoading(false);
      return;
    }

    // Successful — clear rate limit
    clearFails();

    const userEmail = data.user?.email?.trim().toLowerCase() ?? "";
    const { data: sd } = await supabase.from("staff").select("*").ilike("email", userEmail);
    const staffRow = sd?.[0];

    const COOKIE_MAX = 7 * 24 * 60 * 60; // 7 days
    if (loginType === "admin") {
      if (!staffRow) { await supabase.auth.signOut(); setError("Access denied. You are not an admin."); setLoading(false); return; }
      if (staffRow.role && staffRow.role !== "admin") { await supabase.auth.signOut(); setError("Access denied. Please use the Staff tab."); setLoading(false); return; }
      document.cookie = `bg_role=admin; path=/; max-age=${COOKIE_MAX}; SameSite=Strict`;
      router.push("/bg-secure-4x9k");
    } else {
      if (!staffRow) { await supabase.auth.signOut(); setError("Access denied. No staff record found."); setLoading(false); return; }
      if (staffRow.role && staffRow.role === "admin") { await supabase.auth.signOut(); setError("Access denied. Please use the Admin tab."); setLoading(false); return; }
      document.cookie = `bg_role=staff; path=/; max-age=${COOKIE_MAX}; SameSite=Strict`;
      router.push("/staff");
    }
  }

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    setForgotSent(true);
  }

  const isLocked = lockSecs > 0;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }

        .lp {
          min-height: 100vh; background: #07070f;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }

        .bl { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .bl1 { width: 480px; height: 480px; background: radial-gradient(circle,rgba(201,168,76,0.18),transparent); top:-160px; left:-160px; animation: b1 9s ease-in-out infinite; }
        .bl2 { width: 360px; height: 360px; background: radial-gradient(circle,rgba(90,130,245,0.12),transparent); bottom:-100px; right:-100px; animation: b2 11s ease-in-out infinite; }
        @keyframes b1{0%,100%{transform:translate(0,0);}50%{transform:translate(28px,36px);}}
        @keyframes b2{0%,100%{transform:translate(0,0);}50%{transform:translate(-18px,-26px);}}

        .grid { position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px);background-size:56px 56px; }

        .card {
          position:relative;z-index:10;width:100%;max-width:420px;margin:16px;
          background:rgba(255,255,255,0.09);
          backdrop-filter:blur(48px) saturate(220%) brightness(114%);
          -webkit-backdrop-filter:blur(48px) saturate(220%) brightness(114%);
          border:1px solid rgba(255,255,255,0.22);
          border-radius:24px;
          padding:42px 38px 36px;
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.55),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            inset 1px 0 0 rgba(255,255,255,0.18),
            inset -1px 0 0 rgba(255,255,255,0.08),
            0 32px 80px rgba(0,0,0,0.55),
            0 4px 16px rgba(0,0,0,0.2);
          animation:cu 0.55s cubic-bezier(0.22,1,0.36,1) both;
          overflow:hidden;
        }
        .card::before {
          content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
          background:
            radial-gradient(ellipse 70% 45% at 20% 5%, rgba(255,255,255,0.2), transparent 60%),
            radial-gradient(ellipse 40% 55% at 80% 95%, rgba(255,255,255,0.07), transparent 60%);
        }
        .card > * { position:relative;z-index:1; }
        @keyframes cu{from{opacity:0;transform:translateY(28px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}

        .logo {
          width:80px;height:80px;border-radius:50%;overflow:hidden;
          margin:0 auto 18px;
          box-shadow:0 6px 28px rgba(201,168,76,0.32);
          animation:li 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        @keyframes li{from{opacity:0;transform:scale(0.65) rotate(-8deg);}to{opacity:1;transform:scale(1) rotate(0);}}

        .brand { text-align:center; font-family:'Cormorant Garamond',serif; font-size:28px; font-weight:600; color:#fff; letter-spacing:0.01em; }
        .brand em { font-style:italic; color:#c9a84c; }
        .brand-sub { text-align:center; font-size:10px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#3a3a3a; margin-top:5px; margin-bottom:28px; }

        .tabs { display:grid; grid-template-columns:1fr 1fr; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:3px; margin-bottom:26px; }
        .tab { padding:10px 0; border-radius:8px; border:none; cursor:pointer; font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; font-family:'Inter',sans-serif; transition:all 0.22s; background:transparent; color:#3a3a3a; }
        .tab.on { background:rgba(201,168,76,0.12); color:#c9a84c; box-shadow:inset 0 1px 0 rgba(201,168,76,0.15); }
        .tab:hover:not(.on) { color:#666; }

        .flabel { display:block; font-size:11px; font-weight:600; color:#484848; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; }
        .fwrap { position:relative; margin-bottom:14px; }
        .finput { width:100%; padding:13px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; color:#fff; font-size:14px; font-family:'Inter',sans-serif; outline:none; transition:border-color 0.2s,background 0.2s,box-shadow 0.2s; }
        .finput:focus { border-color:rgba(201,168,76,0.45); background:rgba(201,168,76,0.04); box-shadow:0 0 0 3px rgba(201,168,76,0.07); }
        .finput::placeholder { color:#333; }
        .finput:disabled { opacity:0.4; cursor:not-allowed; }

        .eye { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#444; font-size:14px; padding:4px; transition:color 0.2s; }
        .eye:hover { color:#c9a84c; }

        .err { background:rgba(245,101,101,0.08); border:1px solid rgba(245,101,101,0.18); border-radius:9px; padding:9px 13px; font-size:13px; color:#f56565; margin-bottom:14px; display:flex; align-items:center; gap:7px; }

        /* ── Lockout banner ── */
        .lock-banner {
          background: rgba(245,101,101,0.08);
          border: 1px solid rgba(245,101,101,0.28);
          border-radius: 12px; padding: 16px; margin-bottom: 16px;
          animation: lockShake 0.4s cubic-bezier(0.36,0.07,0.19,0.97);
        }
        @keyframes lockShake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-5px);}40%,80%{transform:translateX(5px);}}
        .lock-icon { font-size: 28px; display:block; text-align:center; margin-bottom:8px; }
        .lock-title { font-size: 14px; font-weight: 700; color: #f87171; text-align:center; margin-bottom:4px; }
        .lock-sub { font-size: 12px; color: rgba(248,113,113,0.7); text-align:center; margin-bottom:12px; }
        .lock-timer {
          background: rgba(245,101,101,0.12); border: 1px solid rgba(245,101,101,0.2);
          border-radius: 8px; padding: 10px; text-align:center;
        }
        .lock-timer-num { font-size: 26px; font-weight: 800; color: #f87171; font-family:'Inter',sans-serif; letter-spacing:0.05em; }
        .lock-timer-lbl { font-size: 10px; color: rgba(248,113,113,0.55); letter-spacing:0.15em; text-transform:uppercase; margin-top:2px; }

        /* Attempts warning */
        .att-warn {
          background: rgba(245,180,50,0.07); border: 1px solid rgba(245,180,50,0.2);
          border-radius: 9px; padding: 8px 13px; font-size:12px; color: #f5b432;
          margin-bottom:14px; display:flex; align-items:center; gap:7px;
        }

        .sub { width:100%; padding:13px; margin-top:6px; background:linear-gradient(135deg,#c9a84c,#e8c55a); color:#1a1000; font-size:14px; font-weight:700; letter-spacing:0.04em; font-family:'Inter',sans-serif; border:none; border-radius:10px; cursor:pointer; transition:transform 0.15s,box-shadow 0.2s,opacity 0.2s; box-shadow:0 4px 18px rgba(201,168,76,0.28); }
        .sub:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 7px 24px rgba(201,168,76,0.4); }
        .sub:disabled { opacity:0.5; cursor:not-allowed; }
        .sub.locked { background: rgba(245,101,101,0.15); color: #f87171; box-shadow: none; border: 1px solid rgba(245,101,101,0.25); }

        .spin { display:inline-block; width:15px; height:15px; border:2px solid rgba(26,16,0,0.25); border-top-color:#1a1000; border-radius:50%; animation:sp 0.7s linear infinite; vertical-align:middle; margin-right:7px; }
        @keyframes sp{to{transform:rotate(360deg);}}

        .fnote { text-align:center; font-size:11px; color:#252525; margin-top:22px; }
        .forgot-link { display:block; text-align:center; font-size:12.5px; color:#c9a84c; margin-top:14px; margin-bottom:4px; cursor:pointer; transition:color 0.2s,opacity 0.2s; background:none; border:none; font-family:'Inter',sans-serif; text-decoration:underline; text-underline-offset:3px; opacity:0.8; }
        .forgot-link:hover { opacity:1; color:#e8c55a; }
        .forgot-success { background:rgba(79,208,128,0.08); border:1px solid rgba(79,208,128,0.2); border-radius:10px; padding:16px; text-align:center; }
        .forgot-success-icon { font-size:28px; margin-bottom:8px; }
        .forgot-success-title { font-size:14px; font-weight:700; color:#4fd080; margin-bottom:4px; }
        .forgot-success-sub { font-size:12px; color:rgba(79,208,128,0.65); line-height:1.5; }
        .back-link { display:block; text-align:center; font-size:12px; color:#444; margin-top:16px; cursor:pointer; background:none; border:none; font-family:'Inter',sans-serif; }
        .back-link:hover { color:#c9a84c; }

        .pt { position:absolute; width:2px; height:2px; background:#c9a84c; border-radius:50%; opacity:0; pointer-events:none; animation:pf linear infinite; }
        @keyframes pf{0%{opacity:0;transform:translateY(0) scale(0);}10%{opacity:0.5;transform:translateY(-18px) scale(1);}100%{opacity:0;transform:translateY(-180px) scale(0.4);}}
      `}</style>

      <div className="lp">
        <div className="bl bl1" /><div className="bl bl2" /><div className="grid" />

        {[...Array(7)].map((_,i) => (
          <div key={i} className="pt" style={{ left:`${12+i*12}%`, bottom:`${8+(i%3)*14}%`, animationDuration:`${4+i*1.1}s`, animationDelay:`${i*0.65}s` }} />
        ))}

        <div className="card">
          <div className="logo"><img src="/images/logo.png" alt="Bella & Guy" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} /></div>
          <div className="brand">Bella <em>&</em> Guy</div>
          <div className="brand-sub">Salon Management</div>

          <div className="tabs">
            <button className={`tab ${loginType==="admin"?"on":""}`} onClick={() => { setLoginType("admin"); setError(""); }} disabled={isLocked} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Shield size={13}/>Admin</button>
            <button className={`tab ${loginType==="staff"?"on":""}`} onClick={() => { setLoginType("staff"); setError(""); }} disabled={isLocked} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Scissors size={13}/>Staff</button>
          </div>

          {/* ── Lockout banner ── */}
          {isLocked && (
            <div className="lock-banner">
              <span className="lock-icon" style={{display:"flex",justifyContent:"center"}}><Lock size={28} color="#f87171"/></span>
              <div className="lock-title">Access Temporarily Locked</div>
              <div className="lock-sub">Too many failed attempts. Please wait.</div>
              <div className="lock-timer">
                <div className="lock-timer-num">{fmtTime(lockSecs)}</div>
                <div className="lock-timer-lbl">Remaining</div>
              </div>
            </div>
          )}

          {/* ── Attempts warning (not locked yet) ── */}
          {!isLocked && attLeft < MAX_TRIES && attLeft > 0 && (
            <div className="att-warn">
              <AlertTriangle size={14}/> <span><strong>{attLeft} attempt{attLeft === 1 ? "" : "s"}</strong> remaining before {MAX_TRIES === attLeft + 1 ? "1-minute" : ""} lockout</span>
            </div>
          )}

          {forgotMode ? (
            <>
              {forgotSent ? (
                <div className="forgot-success">
                  <div className="forgot-success-icon" style={{display:"flex",justifyContent:"center"}}><Mail size={28} color="#4fd080"/></div>
                  <div className="forgot-success-title">Reset Link Sent!</div>
                  <div className="forgot-success-sub">Check your email inbox.<br />Click the link to set a new password.</div>
                </div>
              ) : (
                <form onSubmit={sendResetLink}>
                  <label className="flabel">Your Email Address</label>
                  <div className="fwrap">
                    <input type="email" className="finput" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                  </div>
                  <button type="submit" className="sub" disabled={forgotLoading}>
                    {forgotLoading ? <><span className="spin" />Sending…</> : "Send Reset Link"}
                  </button>
                </form>
              )}
              <button className="back-link" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}>← Back to Login</button>
            </>
          ) : (
            <>
              <form onSubmit={login}>
                {error && !isLocked && <div className="err"><AlertTriangle size={14}/>{error}</div>}

                <label className="flabel">Email Address</label>
                <div className="fwrap">
                  <input type="email" className="finput" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" disabled={isLocked} />
                </div>

                <label className="flabel">Password</label>
                <div className="fwrap">
                  <input type={showPass?"text":"password"} className="finput" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingRight:42 }} disabled={isLocked} />
                  <button type="button" className="eye" onClick={() => setShowPass(!showPass)} tabIndex={-1} disabled={isLocked}>{showPass ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
                </div>

                <button type="submit" className={`sub${isLocked?" locked":""}`} disabled={loading || isLocked}>
                  {isLocked
                    ? <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Lock size={14}/>Locked — wait {fmtTime(lockSecs)}</span>
                    : loading
                      ? <>{<span className="spin" />}Signing in…</>
                      : loginType==="admin" ? "Sign In as Admin" : "Sign In as Staff"
                  }
                </button>
              </form>

              {isLocked && (
                <button className="forgot-link" onClick={() => setForgotMode(true)}>Forgot password?</button>
              )}
            </>
          )}

          <div className="fnote" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Shield size={11}/>Protected · Bella & Guy Salon</div>
        </div>
      </div>
    </>
  );
}
