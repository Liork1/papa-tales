import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { getAuthClient } from "@/lib/auth";
import { useLocale } from "@/lib/i18n";

// createBrowserClient is initialized with detectSessionInUrl: true (the default),
// so supabase-js automatically detects ?code= in the URL and calls
// exchangeCodeForSession internally. We only need to wait for the SIGNED_IN event.
const AuthCallback: NextPage = () => {
  const router = useRouter();
  const T = useLocale();
  const done = useRef(false);
  const [state, setState] = useState<"confirming" | "success" | "error">("confirming");

  useEffect(() => {
    const client = getAuthClient();

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (done.current) return;
      if (event === "SIGNED_IN" && session) {
        done.current = true;
        setState("success");
        // Show success message for 2 seconds before redirecting
        setTimeout(() => router.replace("/"), 2000);
        return;
      }
    });

    // Fallback: session may already be set by the time the listener registers
    client.auth.getSession().then(({ data }) => {
      if (done.current) return;
      if (data.session) {
        done.current = true;
        setState("success");
        // Show success message for 2 seconds before redirecting
        setTimeout(() => router.replace("/"), 2000);
        return;
      }
    });

    // Timeout: if no session after 10 s, something went wrong
    const timeout = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        setState("error");
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  const isConfirming = state === "confirming";
  const isSuccess = state === "success";
  const isError = state === "error";

  return (
    <>
      <Head>
        <title>{isSuccess ? "Confirmed" : "Confirming"} · Papa Tales</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#160f33",
        fontFamily: "'Assistant', sans-serif", color: "#fdf3df", fontSize: "1.1rem",
        flexDirection: "column", gap: "1rem", padding: "2rem", textAlign: "center",
      }}>
        {isConfirming && (
          <>
            <div style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite" }}>🌙</div>
            <div>{T.authConfirmWaiting}</div>
          </>
        )}
        {isSuccess && (
          <>
            <div style={{ fontSize: "2.5rem", animation: "bounce .6s ease-in-out" }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{T.authConfirmSuccess}</div>
            <div style={{ fontSize: "0.95rem", color: "#dcc8e0" }}>{T.authConfirmSuccessHint}</div>
          </>
        )}
        {isError && (
          <>
            <div style={{ fontSize: "2.5rem" }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#f5a8a8" }}>{T.authConfirmError}</div>
            <div style={{ fontSize: "0.95rem", color: "#dcc8e0" }}>{T.authConfirmErrorHint}</div>
            <a href="/auth?mode=register" style={{
              marginTop: "1rem", padding: "0.7rem 1.4rem", background: "#7a4fb0",
              color: "#fff", textDecoration: "none", borderRadius: "10px", fontWeight: "600",
            }}>
              Try Again
            </a>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </>
  );
};

export default AuthCallback;
