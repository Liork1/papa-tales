import he from "@/locales/he.json";
import { useRouter } from "next/router";
import HE from "@/locales/he";
import EN from "@/locales/en";

type Translations = typeof he;

function get(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const key of keys) {
    if (typeof cur !== "object" || cur === null) return path;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : path;
}

/** Server-side API error message lookup (always Hebrew). */
export function t(key: string): string {
  return get(he as unknown as Record<string, unknown>, key);
}

/** React hook — returns the locale object matching the current router locale. */
export function useLocale() {
  const { locale } = useRouter();
  return locale === "en" ? EN : HE;
}

export const messages = he;
export type { Translations };
