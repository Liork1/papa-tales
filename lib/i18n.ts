import he from "@/locales/he.json";

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

export function t(key: string): string {
  return get(he as unknown as Record<string, unknown>, key);
}

export const messages = he;
export type { Translations };
