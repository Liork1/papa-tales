// ── mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api-auth", () => ({ serviceDb: jest.fn() }));
jest.mock("@/lib/ai", () => ({ completeChat: jest.fn() }));

// ── imports (after mocks) ─────────────────────────────────────────────────────

import { serviceDb } from "@/lib/api-auth";
import { completeChat } from "@/lib/ai";
import { tryReuseImage } from "@/lib/image-reuse";

const mockServiceDb = serviceDb as jest.Mock;
const mockCompleteChat = completeChat as jest.Mock;

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRow(coverPrompt: string, coverPath: string) {
  return {
    illustrated_story: { cover: coverPrompt },
    image_paths: { cover: coverPath },
  };
}

function makeDb({
  count = 200,
  rows = [makeRow("a fox in a forest", "user1/story1/cover.webp")],
  downloadData = Buffer.from("fake-image-bytes"),
}: {
  count?: number;
  rows?: ReturnType<typeof makeRow>[];
  downloadData?: Buffer | null;
} = {}) {
  const download = jest.fn().mockResolvedValue({
    data: downloadData ? new Blob([downloadData]) : null,
  });

  const selectChain = {
    not: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows }),
  };

  const countChain = {
    not: jest.fn().mockReturnThis(),
    neq: jest.fn().mockResolvedValue({ count }),
  };

  const db = {
    from: jest.fn((table: string) => {
      if (table === "user_story_library") {
        return {
          select: jest.fn((fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count) return countChain;
            return selectChain;
          }),
        };
      }
      return {};
    }),
    storage: {
      from: jest.fn().mockReturnValue({ download }),
    },
    _download: download,
  };
  return db;
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.IMAGE_REUSE_MIN_POOL;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("tryReuseImage", () => {
  describe("pool size gate", () => {
    it("returns null when pool is below IMAGE_REUSE_MIN_POOL (default 150)", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 149 }));
      const result = await tryReuseImage("a dog in a park");
      expect(result).toBeNull();
      expect(mockCompleteChat).not.toHaveBeenCalled();
    });

    it("proceeds when pool equals IMAGE_REUSE_MIN_POOL", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 150 }));
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: null, confidence: 30 }));
      const result = await tryReuseImage("a dog in a park");
      expect(mockCompleteChat).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("respects custom IMAGE_REUSE_MIN_POOL env var", async () => {
      process.env.IMAGE_REUSE_MIN_POOL = "5";
      mockServiceDb.mockReturnValue(makeDb({ count: 4 }));
      const result = await tryReuseImage("a dog in a park");
      expect(result).toBeNull();
      expect(mockCompleteChat).not.toHaveBeenCalled();
    });
  });

  describe("LLM match — no match", () => {
    it("returns null when LLM confidence is ≤ 85", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 200 }));
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: 0, confidence: 80 }));
      const result = await tryReuseImage("a dragon flying over mountains");
      expect(result).toBeNull();
    });

    it("returns null when LLM returns matchIndex: null", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 200 }));
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: null, confidence: 50 }));
      const result = await tryReuseImage("a dragon flying over mountains");
      expect(result).toBeNull();
    });
  });

  describe("LLM match — hit", () => {
    it("returns base64 image when confidence > 85", async () => {
      const db = makeDb({ count: 200 });
      mockServiceDb.mockReturnValue(db);
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: 0, confidence: 92 }));

      const result = await tryReuseImage("a fox sitting under an oak tree");

      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe("image/webp");
      expect(typeof result?.imageData).toBe("string");
      expect(db._download).toHaveBeenCalledWith("user1/story1/cover.webp");
    });

    it("correctly selects the matched candidate by index", async () => {
      const rows = [
        makeRow("a cat on a rooftop", "user1/story1/cover.webp"),
        makeRow("a fox in the forest", "user2/story2/cover.webp"),
        makeRow("a rabbit in a meadow", "user3/story3/cover.webp"),
      ];
      const db = makeDb({ count: 200, rows });
      mockServiceDb.mockReturnValue(db);
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: 1, confidence: 90 }));

      await tryReuseImage("a fox among tall trees");

      expect(db._download).toHaveBeenCalledWith("user2/story2/cover.webp");
    });
  });

  describe("error resilience", () => {
    it("returns null when storage download fails", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 200, downloadData: null }));
      mockCompleteChat.mockResolvedValue(JSON.stringify({ matchIndex: 0, confidence: 95 }));
      const result = await tryReuseImage("a fox in a forest");
      expect(result).toBeNull();
    });

    it("returns null when LLM returns invalid JSON", async () => {
      mockServiceDb.mockReturnValue(makeDb({ count: 200 }));
      mockCompleteChat.mockResolvedValue("not valid json {{");
      const result = await tryReuseImage("a fox in a forest");
      expect(result).toBeNull();
    });

    it("returns null when no candidates have both prompt and path", async () => {
      const rows = [
        { illustrated_story: { cover: "" }, image_paths: { cover: "path.webp" } },
        { illustrated_story: { cover: "prompt" }, image_paths: { cover: "" } },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = makeDb({ count: 200, rows: rows as any });
      mockServiceDb.mockReturnValue(db);
      const result = await tryReuseImage("anything");
      expect(result).toBeNull();
      expect(mockCompleteChat).not.toHaveBeenCalled();
    });
  });
});
