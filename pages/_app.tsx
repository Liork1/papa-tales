import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { UserProvider } from "@/lib/user-context";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
