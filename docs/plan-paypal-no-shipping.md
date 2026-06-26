# Plan: PayPal No Shipping Address

## Context
PayPal shows the buyer's shipping address on the checkout page. Papa Tales sells digital credits — no physical shipment — so the address is irrelevant and looks wrong.

## Change (COMPLETED)

**`pages/api/paypal/create-order.ts`** — added `shipping_preference: "NO_SHIPPING"` to `application_context`:

```typescript
application_context: {
  return_url: `${appUrl}/?payment=success`,
  cancel_url:  `${appUrl}/?payment=cancel`,
  brand_name:  "Papa Tales",
  locale:      "he-IL",
  landing_page: "BILLING",
  user_action:  "PAY_NOW",
  shipping_preference: "NO_SHIPPING",
},
```

## Verification
Trigger a PayPal checkout as a different user → shipping address section is gone from the checkout page.
