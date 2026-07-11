import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { signInWithGoogle, signUpWithEmail, signInWithEmail, sendPasswordReset } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";

const ACCENT = { main: "#7a4fb0", deep: "#553089" };

const AuthPage: NextPage = () => {
  const router = useRouter();
  const T = useLocale();
  const locale = router.locale ?? "he";
  const { mode: modeParam } = router.query;

  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Sync mode from query param
  useEffect(() => {
    if (modeParam === "signin") setMode("signin");
    else if (modeParam === "register") setMode("register");
  }, [modeParam]);

  const isRegister = mode === "register";
  const nm = displayName.trim();
  const ctaDisabled = loading || googleLoading || (isRegister && !terms) || !email || !password;

  const handleGoogle = async () => {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // signInWithOAuth triggers a browser redirect; if we reach the line below,
      // the redirect was blocked (e.g. MIUI link interception). Show an error
      // after a short grace period for slow networks.
      await new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redirect_timeout")), 6000)
      );
    } catch {
      setError(T.authGoogleError);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (ctaDisabled) return;
    setLoading(true);
    setError(null);
    const timeoutResult = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: T.authTimeout }), 15000)
    );
    if (isRegister) {
      const { error: err } = await Promise.race([signUpWithEmail(email, password, nm || undefined), timeoutResult]);
      if (err) { setError(err); setLoading(false); return; }
    } else {
      const { error: err } = await Promise.race([signInWithEmail(email, password), timeoutResult]);
      if (err) { setError(err); setLoading(false); return; }
    }
    router.replace("/");
  };

  const handleForgot = async () => {
    if (!email) { setError(T.authForgotNoEmail); return; }
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

  // Terms/Privacy open in a new tab as a plain page load, so they go through
  // the locale-redirect middleware — which trusts the NEXT_LOCALE cookie over
  // the link's href. Stamp the cookie to match this page's own locale first,
  // so the new tab lands in the same language the user is currently reading.
  const syncLocaleCookie = () => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
  };

  return (
    <>
      <Head>
        <title>{isRegister ? T.authPageTitleRegister : T.authPageTitleSignin}</title>
        <meta name="description" content={isRegister ? T.authDescRegister : T.authDescSignin} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div dir={locale === "he" ? "rtl" : "ltr"} style={{
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
            {isRegister ? T.authHeadingRegister : T.authHeadingSignin}
          </h1>
          <p style={{ fontSize: ".9rem", color: "#9a7fb0", textAlign: "center", marginBottom: "1.5rem", fontWeight: 500 }}>
            {isRegister ? T.authSubRegister : T.authSubSignin}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: ".6rem", padding: ".8rem", background: "#fff",
              border: "1.5px solid #e2d8c8", borderRadius: 14,
              cursor: loading || googleLoading ? "not-allowed" : "pointer",
              opacity: loading || googleLoading ? 0.6 : 1,
              fontFamily: "'Rubik', sans-serif", fontSize: ".98rem", fontWeight: 600, color: "#3a2a3a",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            {googleLoading ? "…" : isRegister ? T.authGoogleRegister : T.authGoogleSignin}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: ".7rem", margin: "1.2rem 0" }}>
            <span style={{ flex: 1, height: 1, background: "#e7dccd" }} />
            <span style={{ fontSize: ".8rem", color: "#b6a48d", fontWeight: 600 }}>{T.authOr}</span>
            <span style={{ flex: 1, height: 1, background: "#e7dccd" }} />
          </div>

          {/* Email */}
          <div style={{ marginBottom: ".9rem" }}>
            <label style={{ display: "block", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 600, color: "#5c4a78", marginBottom: ".4rem" }}>
              {T.authEmail}
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
              {T.authPassword}
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
                {T.authDisplayName} <span style={{ color: "#b6a48d", fontWeight: 500 }}>· {T.optional}</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                placeholder={T.authDisplayNamePh}
                style={{ width: "100%", boxSizing: "border-box", padding: ".7rem .9rem", border: "1.5px solid #e7dccd", borderRadius: 14, fontSize: "1rem", fontFamily: "'Assistant', sans-serif", background: "#fffdf8", color: "#3a2a1a", direction: "inherit", outline: "none" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: ".45rem", marginTop: ".5rem", background: "#f7f2fb", borderRadius: 10, padding: ".45rem .7rem" }}>
                <span style={{ fontSize: ".72rem", color: "#9a7fb0", fontWeight: 600 }}>{T.authDisplayNameSuffix}</span>
                <span style={{ fontSize: ".82rem", color: "#5c4a78", fontWeight: 700 }}>{nm ? T.hi(nm) : T.authGreetingEmpty}</span>
              </div>
              <div style={{ fontSize: ".72rem", color: "#b6a48d", marginTop: ".4rem" }}>{T.authDisplayNameNote}</div>
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
                {T.authTermsAgree}{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  onClick={(e) => { e.stopPropagation(); syncLocaleCookie(); }}
                  style={{ color: "#5b37b7", fontWeight: 600 }}
                >
                  {T.authTermsService}
                </Link>{" "}
                {T.authTermsAnd}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  onClick={(e) => { e.stopPropagation(); syncLocaleCookie(); }}
                  style={{ color: "#5b37b7", fontWeight: 600 }}
                >
                  {T.authTermsPrivacy}
                </Link>
              </span>
            </label>
          )}

          {/* Forgot password (sign-in only) */}
          {!isRegister && (
            <div style={{ textAlign: "left", margin: "-.2rem 0 1.2rem" }}>
              {forgotSent ? (
                <span style={{ fontSize: ".82rem", color: "#2ea36b", fontWeight: 600 }}>{T.authForgotSent}</span>
              ) : (
                <button
                  onClick={handleForgot}
                  style={{ background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".82rem", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  {T.authForgot}
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
            {loading ? "…" : isRegister ? T.authCtaRegister : T.authCtaSignin}
          </button>

          {/* Toggle */}
          <p style={{ textAlign: "center", fontSize: ".88rem", color: "#6b5a82", margin: "1.2rem 0 0" }}>
            {isRegister ? T.authToggleHaveAccount : T.authToggleNoAccount}
            {" "}
            <button
              onClick={toggleMode}
              style={{ background: "none", border: "none", color: "#5b37b7", fontFamily: "'Rubik', sans-serif", fontSize: ".88rem", fontWeight: 700, cursor: "pointer", padding: "0 .2rem" }}
            >
              {isRegister ? T.signIn : T.register}
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
