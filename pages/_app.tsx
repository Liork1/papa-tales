import type { AppProps } from "next/app";
import { useEffect } from "react";
import "@/styles/globals.css";
import { UserProvider } from "@/lib/user-context";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
