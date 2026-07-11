import type { PlayProductId } from "@/lib/billing-packages";

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<Array<{ itemId: string; price: { currency: string; value: string } }>>;
}

declare global {
  interface Window {
    getDigitalGoodsService?: (paymentMethod: string) => Promise<DigitalGoodsService>;
  }
}

// The Digital Goods API only exists in Chrome when the page is running inside
// a Play-installed TWA with Play Billing enabled — this doubles as our platform check.
export function isPlayBillingAvailable(): boolean {
  return typeof window !== "undefined" && "getDigitalGoodsService" in window;
}

export async function purchaseViaPlayBilling(
  productId: PlayProductId
): Promise<{ productId: PlayProductId; purchaseToken: string }> {
  const request = new PaymentRequest(
    [{ supportedMethods: "https://play.google.com/billing", data: { sku: productId } }],
    { total: { label: "Total", amount: { currency: "USD", value: "0" } } }
  );

  const response = await request.show();
  const purchaseToken = (response.details as { purchaseToken: string }).purchaseToken;
  await response.complete("success");

  return { productId, purchaseToken };
}
