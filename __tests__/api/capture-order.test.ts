import type { NextApiRequest, NextApiResponse } from "next";

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api-auth", () => ({ getRequestUser: jest.fn(), serviceDb: jest.fn() }));
jest.mock("@/lib/paypal", () => ({
  PACKAGES: { p3: { credits: 3, amount: "3.00" }, p6: { credits: 6, amount: "5.00" }, p12: { credits: 12, amount: "8.00" } },
  paypalBase: jest.fn().mockReturnValue("https://api-m.sandbox.paypal.com"),
  getPayPalAccessToken: jest.fn().mockResolvedValue("mock-token"),
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { getRequestUser, serviceDb } from "@/lib/api-auth";
import handler from "@/pages/api/paypal/capture-order";

const mockGetRequestUser = getRequestUser as jest.Mock;
const mockServiceDb = serviceDb as jest.Mock;

// ── helpers ───────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-123" };

function makeSupabaseMock(existingCredits = 0) {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const single = jest.fn().mockResolvedValue({
    data: existingCredits > 0 ? { credits_remaining: existingCredits, total_purchased: existingCredits } : null,
  });
  return {
    from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single, upsert }),
    _upsert: upsert,
  };
}

function makePayPalCapture(customId: string) {
  return {
    status: "COMPLETED",
    purchase_units: [{
      payments: {
        captures: [{ id: "cap-1", custom_id: customId }],
      },
    }],
  };
}

function makeReq(body: Record<string, unknown>): NextApiRequest {
  return { method: "POST", body, cookies: {}, headers: { authorization: "Bearer test-token" }, socket: { remoteAddress: "127.0.0.1" } } as unknown as NextApiRequest;
}

function makeRes() {
  const res = {
    _status: 200,
    _json: undefined as unknown,
    status(code: number) { this._status = code; return this; },
    json(data: unknown) { this._json = data; return this; },
    end() { return this; },
  };
  return res as unknown as NextApiResponse & { _status: number; _json: unknown };
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRequestUser.mockResolvedValue(TEST_USER);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/paypal/capture-order", () => {
  describe("method guard", () => {
    it("returns 405 for non-POST requests", async () => {
      const req = { method: "GET", body: {}, cookies: {}, headers: {}, socket: {} } as unknown as NextApiRequest;
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(405);
    });
  });

  describe("input validation", () => {
    it("returns 400 when orderId is missing", async () => {
      const db = makeSupabaseMock();
      mockServiceDb.mockReturnValue(db);
      const res = makeRes();
      await handler(makeReq({}), res);
      expect(res._status).toBe(400);
    });
  });

  describe("credit granting — all 3 packages", () => {
    it.each([
      ["p3", 3],
      ["p6", 6],
      ["p12", 12],
    ])("grants correct credits for package %s ($%s credits)", async (pkgId, expectedCredits) => {
      const db = makeSupabaseMock(0);
      mockServiceDb.mockReturnValue(db);

      const capturePayload = makePayPalCapture(pkgId);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => capturePayload,
      } as Response);

      const res = makeRes();
      await handler(makeReq({ orderId: "order-abc" }), res);

      expect(res._status).toBe(200);
      expect((res._json as { credits: number }).credits).toBe(expectedCredits);

      const upsertCall = db._upsert.mock.calls[0][0];
      expect(upsertCall.credits_remaining).toBe(expectedCredits);
      expect(upsertCall.total_purchased).toBe(expectedCredits);
    });

    it("accumulates credits on top of existing balance", async () => {
      const db = makeSupabaseMock(4); // user already has 4 credits
      mockServiceDb.mockReturnValue(db);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => makePayPalCapture("p3"),
      } as Response);

      const res = makeRes();
      await handler(makeReq({ orderId: "order-abc" }), res);

      expect(res._status).toBe(200);
      const upsertCall = db._upsert.mock.calls[0][0];
      expect(upsertCall.credits_remaining).toBe(7); // 4 existing + 3 new
    });
  });

  describe("custom_id path", () => {
    it("reads custom_id from purchase_units[0].payments.captures[0], not purchase_units[0]", async () => {
      const db = makeSupabaseMock(0);
      mockServiceDb.mockReturnValue(db);

      // Simulate the OLD broken PayPal response shape (custom_id at wrong level)
      const brokenCapture = {
        status: "COMPLETED",
        purchase_units: [{
          custom_id: "p3",        // wrong location — should be ignored
          payments: {
            captures: [{ id: "cap-1", custom_id: "p12" }], // correct location
          },
        }],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => brokenCapture,
      } as Response);

      const res = makeRes();
      await handler(makeReq({ orderId: "order-abc" }), res);

      expect(res._status).toBe(200);
      // Should read p12 (12 credits) from the correct path, not p3 (3) from wrong path
      expect((res._json as { credits: number }).credits).toBe(12);
    });

    it("falls back to p6 (6 credits) when custom_id is missing entirely", async () => {
      const db = makeSupabaseMock(0);
      mockServiceDb.mockReturnValue(db);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "COMPLETED",
          purchase_units: [{ payments: { captures: [{ id: "cap-1" }] } }],
        }),
      } as Response);

      const res = makeRes();
      await handler(makeReq({ orderId: "order-abc" }), res);

      expect(res._status).toBe(200);
      expect((res._json as { credits: number }).credits).toBe(6);
    });
  });

  describe("PayPal error handling", () => {
    it("returns 402 when PayPal capture is not COMPLETED", async () => {
      const db = makeSupabaseMock(0);
      mockServiceDb.mockReturnValue(db);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ status: "DECLINED" }),
      } as Response);

      const res = makeRes();
      await handler(makeReq({ orderId: "order-abc" }), res);

      expect(res._status).toBe(402);
    });
  });
});
