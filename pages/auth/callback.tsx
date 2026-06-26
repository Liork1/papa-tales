import type { NextPage } from "next";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { getAuthClient } from "@/lib/auth";

// createBrowserClient is initialized with detectSessionInUrl: true (the default),
// so supabase-js automatically detects ?code= in the URL and calls
// exchangeCodeForSession internally. We only need to wait for the SIGNED_IN event.
const AuthCallback: NextPage = () => {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    const client = getAuthClient();

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (done.current) return;
      if (event === "SIGNED_IN" && session) {
        done.current = true;
        router.replace("/");
      }
    });

    // Fallback: session may already be set by the time the listener registers
    client.auth.getSession().then(({ data }) => {
      if (done.current) return;
      if (data.session) {
        done.current = true;
        router.replace("/");
      }
    });

    // Timeout: if no session after 10 s, something went wrong
    const timeout = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        router.replace("/?auth_error=1");
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      <Head>
        <title>מתחבר… · אבא סיפור</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#160f33",
        fontFamily: "'Assistant', sans-serif", color: "#fdf3df", fontSize: "1.1rem",
      }}>
        מתחבר…
      </div>
    </>
  );
};

export default AuthCallback;
