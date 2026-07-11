export const PLAY_PRODUCTS = {
  credits_3: { credits: 3, pkgId: "p3" },
  credits_6: { credits: 6, pkgId: "p6" },
  credits_12: { credits: 12, pkgId: "p12" },
} as const;

export type PlayProductId = keyof typeof PLAY_PRODUCTS;
export type PkgId = "p3" | "p6" | "p12";

export const PKG_TO_PLAY_PRODUCT: Record<PkgId, PlayProductId> = {
  p3: "credits_3",
  p6: "credits_6",
  p12: "credits_12",
};
