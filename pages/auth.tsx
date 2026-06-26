import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithGoogle, signUpWithEmail, signInWithEmail, sendPasswordReset, getSession } from "@/lib/auth";

const ACCENT = { main: "#7a4fb0", deep: "#553089" };

const AuthPage: NextPage = () => {
  const router = useRouter();
  const { mode: modeParam } = router.query;

  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Sync mode from query param
  useEffect(() => {
    if (modeParam === "signin") setMode("signin");
    else if (modeParam === "register") setMode("register");
  }, [modeParam]);

  // Redirect if already signed in
  useEffect(() => {
    getSession().then((s) => {
      if (s) router.replace("/");
    });
  }, [router]);

  const isRegister = mode === "register";
  const nm = displayName.trim();
  const ctaDisabled = loading || (isRegister && !terms) || !email || !password;

  const handleGoogle = () => {
    signInWithGoogle();
  };

  const handleSubmit = async () => {
    if (ctaDisabled) return;
    setLoading(true);
    setError(null);
    if (isRegister) {
      const { error: err } = await signUpWithEmail(email, password, nm || undefined);
      if (err) { setError(err); setLoading(false); return; }
    } else {
      const { error: err } = await signInWithEmail(email, password);
      if (err) { setError(err); setLoading(false); return; }
    }
    router.replace("/");
  };

  const handleForgot = async () => {
    if (!email) { setError("הכניסו אימייל בשדה למעלה לפני השחזור"); return; }
    setLoading(true);
    await sendPasswordReset(email);
    setForgotSent(true);
    setLoading(false);
  };

  const toggleMode = () => {
    setMode((m) => (m === "register" ? "signin" : "register"));
    setError(null);
    setForgotSent(false);
  };

  return (
    <>
      <Head>
        <title>{isRegister ? "הרשמה לאבא סיפור — קבלו 5 סיפורים חינם" : "כניסה · אבא סיפור"}</title>
        <meta name="description" content={isRegister ? "הירשמו לאבא סיפור וקבלו 5 סיפורי ילדים מחורזים ומאויירים בחינם." : "היכנסו לחשבון אבא סיפור."} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div dir="rtl" style={{
        position: "relative", minHeight: "100vh", width: "100%", boxSizing: "border-box",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "1.2rem", padding: "2.2rem 1rem", fontFamily: "'Assistant', sans-serif",
      }}>
        {/* Starfield background */}
        <div style={{
          position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none",
          background: "radial-gradient(2px 2px at 12% 20%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 80% 14%, rgba(255,255,255,.6), transparent), radial-gradient(1.5px 1.5px at 62% 72%, rgba(255,255,255,.45), transparent), radial-gradient(1px 1px at 35% 50%, rgba(255,255,255,.5), transparent), radial-gradient(135% 105% at 50% -25%, #3a2d6e 0%, #241a52 48%, #160f33 100%)",
        }} />

        <div style={{
          background: "#fff8ef", borderRadius: 26, padding: "2rem 2.1rem 2.1rem",
          width: "min(440px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
          animation: "auRise .4s ease both",
        }}>
          {/* Moon */}
          <div style={{ textAlign: "center", marginBottom: ".3rem" }}>
            <span style={{ display: "inline-block", fontSize: "2.1rem", lineHeight: 1, animation: "auFloat 4s ease-in-out infinite" }}>🌙</span>
          </div>

          <h1 style={{ fontFamily: "'Rubik', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#3a2a5c", textAlign: "center", margin: ".2rem 0 .15rem" }}>
            {isRegister ? "יצירת חשבון" : "כניסה לחשבון"}
          </h1>
          <p style={{ fontSize: ".9rem", color: "#9a7fb0", textAlign: "center", marginBottom: "1.5rem", fontWeight: 500 }}>
            {isRegister ? "הירשמו וקבלו 5 סיפורים חינם" : "טוב לראות אתכם שוב"}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: ".6rem", padding: ".8rem", background: "#fff",
              border: "1.5px solid #e2d8c8", borderRadius: 14, cursor: "pointer",
              fontFamily: "'Rubik', sans-serif", fontSize: ".98rem", fontWeight: 600, color: "#3a2a3a",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            {isRegister ? "הרשמה עם Google" : "המשך עם Google"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: ".7rem", margin: "1.2rem 0" }}>
            <span style={{ flex: 1, height: 1, background: "#e7dccd" }} />
            <span style={{ fontSize: ".8rem", color: "#b6a48d", fontWeight: 600 }}>או</span>
            <span style={{ flex: 1, height: 1, background: "#e7dccd" }} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: ".9rem" }}>
            <label style={{ display: "block", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 600, color: "#5c4a78", marginBottom: ".4rem" }}>
              אימייל
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: ".7rem .9rem", border: "1.5px solid #e7dccd", borderRadius: 14, fontSize: "1rem", fontFamily: "'Assistant', sans-serif", background: "#fffdf8", color: "#3a2a1a", direction: "ltr", textAlign: "left", outline: "none" }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: ".9rem" }}>
            <label style={{ display: "block", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 600, color: "#5c4a78", marginBottom: ".4rem" }}>
              סיסמה
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", boxSizing: "border-box", padding: ".7rem .9rem", border: "1.5px solid #e7dccd", borderRadius: 14, fontSize: "1rem", fontFamily: "'Assistant', sans-serif", background: "#fffdf8", color: "#3a2a1a", direction: "ltr", textAlign: "left", outline: "none" }}
            />
          </div>

          {/* Display name (register only) */}
          {isRegister && (
            <div style={{ marginBottom: ".9rem" }}>
              <label style={{ display: "block", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 600, color: "#5c4a78", marginBottom: ".4rem" }}>
                שם תצוגה <span style={{ color: "#b6a48d", fontWeight: 500 }}>· אופציונלי</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                placeholder="איך לפנות אליך?"
                style={{ width: "100%", boxSizing: "border-box", padding: ".7rem .9rem", border: "1.5px solid #e7dccd", borderRadius: 14, fontSize: "1rem", fontFamily: "'Assistant', sans-serif", background: "#fffdf8", color: "#3a2a1a", direction: "rtl", outline: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: ".45rem", marginTop: ".5rem", background: "#f7f2fb", borderRadius: 10, padding: ".45rem .7rem" }}>
                <span style={{ fontSize: ".72rem", color: "#9a7fb0", fontWeight: 600 }}>כך נפנה אליך:</span>
                <span style={{ fontSize: ".82rem", color: "#5c4a78", fontWeight: 700 }}>{nm ? `שלום, ${nm}` : "שלום! 🌙"}</span>
              </div>
              <div style={{ fontSize: ".72rem", color: "#b6a48d", marginTop: ".4rem" }}>אפשר להשלים או לשנות מאוחר יותר.</div>
            </div>
          )}

          {/* Terms (register only) */}
          {isRegister && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: ".55rem", margin: "1rem 0 1.3rem", cursor: "pointer" }}>
              <span
                onClick={() => setTerms((t) => !t)}
                style={{
                  width: 22, height: 22, flex: "none", borderRadius: 7,
                  border: `1.5px solid ${terms ? ACCENT.main : "#d8cce8"}`,
                  background: terms ? ACCENT.main : "#fffdf8",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".8rem", fontWeight: 800, cursor: "pointer", marginTop: 1,
                }}
              >
                {terms ? "✓" : ""}
              </span>
              <span style={{ fontSize: ".82rem", color: "#6b5a82", lineHeight: 1.5 }}>
                אני מאשר/ת את <span style={{ color: "#5b37b7", fontWeight: 600 }}>תנאי השימוש</span> ו<span style={{ color: "#5b37b7", fontWeight: 600 }}>מדיניות הפרטיות</span>
              </span>
            </label>
          )}

          {/* Forgot password (sign-in only) */}
          {!isRegister && (
            <div style={{ textAlign: "left", margin: "-.2rem 0 1.2rem" }}>
              {forgotSent ? (
                <span style={{ fontSize: ".82rem", color: "#2ea36b", fontWeight: 600 }}>✓ קישור שחזור נשלח לאימייל</span>
              ) : (
                <button
                  onClick={handleForgot}
                  style={{ background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".82rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  שכחתי סיסמה
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#fdf0f0", border: "1px solid #f5c6c6", borderRadius: 10, padding: ".6rem .9rem", marginBottom: ".9rem", fontSize: ".85rem", color: "#a63232", direction: "rtl" }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={ctaDisabled}
            style={{
              width: "100%", padding: ".9rem", border: "none", borderRadius: 16,
              color: "#fff", fontFamily: "'Rubik', sans-serif", fontSize: "1.04rem", fontWeight: 700,
              cursor: ctaDisabled ? "not-allowed" : "pointer",
              opacity: ctaDisabled ? 0.45 : 1,
              background: `linear-gradient(135deg, ${ACCENT.main}, ${ACCENT.deep})`,
              boxShadow: ctaDisabled ? "none" : `0 10px 24px ${ACCENT.main}55`,
            }}
          >
            {loading ? "…" : isRegister ? "יצירת חשבון" : "כניסה"}
          </button>

          {/* Toggle */}
          <p style={{ textAlign: "center", fontSize: ".88rem", color: "#6b5a82", margin: "1.2rem 0 0" }}>
            {isRegister ? "כבר יש לכם חשבון?" : "אין לכם חשבון עדיין?"}
            {" "}
            <button
              onClick={toggleMode}
              style={{ background: "none", border: "none", color: "#5b37b7", fontFamily: "'Rubik', sans-serif", fontSize: ".88rem", fontWeight: 700, cursor: "pointer", padding: "0 .2rem" }}
            >
              {isRegister ? "כניסה" : "הרשמה"}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes auRise { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes auFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </>
  );
};

export default AuthPage;
