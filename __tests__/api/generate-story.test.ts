import type { NextApiRequest, NextApiResponse } from "next";

// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("@/lib/ai", () => ({
  generateStory: jest.fn(),
}));

jest.mock("@/lib/stories", () => ({
  getContextualStories: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { generateStory } from "@/lib/ai";
import { getContextualStories } from "@/lib/stories";
import { checkRateLimit } from "@/lib/rate-limit";
import handler from "@/pages/api/generate-story";

const mockCreateServerClient = createServerClient as jest.Mock;
const mockGenerateStory = generateStory as jest.Mock;
const mockGetContextualStories = getContextualStories as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

// ── fixtures ──────────────────────────────────────────────────────────────────

const ALLOWED_RATE = { allowed: true, remaining: 9, resetAt: Date.now() + 3600000 };
const BLOCKED_RATE = { allowed: false, remaining: 0, resetAt: Date.now() + 3600000 };

const GENERATED = {
  title: "כוכב קטן",
  pages: { "1": "בלילה שקט", "2": "זרח כוכב" },
  rhymeScheme: "AABB",
  illustratedStory: {},
};

function makeSupabaseMock({
  user = null,
  storiesGenerated = 0,
  creditsRemaining = 0,
}: {
  user?: { id: string } | null;
  storiesGenerated?: number;
  creditsRemaining?: number;
} = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: user
          ? { stories_generated: storiesGenerated, credits_remaining: creditsRemaining }
          : null,
      }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  };
}

function makeReq(body: Record<string, unknown>, method = "POST"): NextApiRequest {
  return {
    method,
    body,
    cookies: {},
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

function makeRes() {
  const headers: Record<string, string | number> = {};
  const res = {
    _status: 200,
    _json: undefined as unknown,
    status(code: number) { this._status = code; return this; },
    json(data: unknown) { this._json = data; return this; },
    setHeader(name: string, value: string | number) { headers[name] = value; },
    appendHeader: jest.fn(),
    _headers: headers,
  };
  return res as unknown as NextApiResponse & { _status: number; _json: unknown };
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(ALLOWED_RATE);
  mockGetContextualStories.mockResolvedValue([]);
  mockGenerateStory.mockResolvedValue(GENERATED);
  mockCreateServerClient.mockReturnValue(makeSupabaseMock());
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/generate-story", () => {
  describe("method guard", () => {
    it("returns 405 for non-POST requests", async () => {
      const res = makeRes();
      await handler(makeReq({}, "GET"), res);
      expect(res._status).toBe(405);
      expect((res._json as { success: boolean }).success).toBe(false);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      mockCheckRateLimit.mockReturnValue(BLOCKED_RATE);
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק" }), res);
      expect(res._status).toBe(429);
      expect((res._json as { success: boolean }).success).toBe(false);
      expect((res._json as { error: { code: string } }).error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("input validation", () => {
    it("returns 400 when prompt is missing", async () => {
      const res = makeRes();
      await handler(makeReq({}), res);
      expect(res._status).toBe(400);
    });

    it("returns 400 when prompt is too short (< 10 chars)", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "קצר" }), res);
      expect(res._status).toBe(400);
      expect((res._json as { error: { code: string } }).error.code).toBe("INVALID_INPUT");
    });

    it("returns 400 when prompt exceeds 500 chars", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "א".repeat(501) }), res);
      expect(res._status).toBe(400);
    });

    it("returns 400 for an invalid ageGroup value", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק", ageGroup: "99-100" }), res);
      expect(res._status).toBe(400);
      expect((res._json as { error: { code: string } }).error.code).toBe("INVALID_INPUT");
    });

    it("accepts a valid ageGroup value", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה", ageGroup: "4-6" }), res);
      expect(res._status).toBe(200);
    });
  });

  describe("DB error handling", () => {
    it("returns 500 when getContextualStories throws", async () => {
      mockGetContextualStories.mockRejectedValue(new Error("DB connection failed"));
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק" }), res);
      expect(res._status).toBe(500);
      expect((res._json as { error: { code: string } }).error.code).toBe("DB_ERROR");
    });
  });

  describe("AI error handling", () => {
    it("returns 500 when generateStory throws", async () => {
      mockGenerateStory.mockRejectedValue(new Error("AI timeout"));
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק" }), res);
      expect(res._status).toBe(500);
      expect((res._json as { error: { code: string } }).error.code).toBe("AI_ERROR");
    });
  });

  describe("successful generation", () => {
    it("returns 200 with story data for a guest user", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה" }), res);
      expect(res._status).toBe(200);
      const data = res._json as { success: boolean; data: { title: string; pages: Record<string, string> } };
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("כוכב קטן");
      expect(data.data.pages).toEqual(GENERATED.pages);
    });

    it("includes wordCount, rhymeScheme, and generatedAt in the response", async () => {
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה" }), res);
      const data = res._json as { data: { wordCount: number; rhymeScheme: string; generatedAt: string } };
      expect(typeof data.data.wordCount).toBe("number");
      expect(data.data.rhymeScheme).toBe("AABB");
      expect(data.data.generatedAt).toBeDefined();
    });
  });

  describe("tier quota enforcement", () => {
    it("returns 402 when a free user has used 5 or more stories", async () => {
      mockCreateServerClient.mockReturnValue(
        makeSupabaseMock({ user: { id: "u1" }, storiesGenerated: 5, creditsRemaining: 0 })
      );
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה", useCredit: false }), res);
      expect(res._status).toBe(402);
      expect((res._json as { error: { code: string } }).error.code).toBe("QUOTA_EXCEEDED");
    });

    it("returns 402 when a user requests a credit story but has no credits", async () => {
      mockCreateServerClient.mockReturnValue(
        makeSupabaseMock({ user: { id: "u1" }, storiesGenerated: 3, creditsRemaining: 0 })
      );
      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה", useCredit: true }), res);
      expect(res._status).toBe(402);
      expect((res._json as { error: { code: string } }).error.code).toBe("NO_CREDITS");
    });

    it("deducts a credit and marks usedCredit=true when the user has credits", async () => {
      const supabaseMock = makeSupabaseMock({ user: { id: "u1" }, storiesGenerated: 1, creditsRemaining: 3 });
      mockCreateServerClient.mockReturnValue(supabaseMock);

      const res = makeRes();
      await handler(makeReq({ prompt: "ילד קטן אוהב לשחק בגינה", useCredit: true }), res);

      expect(res._status).toBe(200);
      expect((res._json as { data: { usedCredit: boolean } }).data.usedCredit).toBe(true);
    });
  });
});
