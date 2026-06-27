import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api-auth", () => ({
  getRequestUser: jest.fn(),
  serviceDb: jest.fn(),
}));

import handler from "@/pages/api/stories/library";
import { getRequestUser, serviceDb } from "@/lib/api-auth";

const mockGetUser = getRequestUser as jest.MockedFunction<typeof getRequestUser>;
const mockServiceDb = serviceDb as jest.MockedFunction<typeof serviceDb>;

const MOCK_USER = { id: "user-1" } as Parameters<typeof getRequestUser>[0] extends infer R ? R : never;

function makeReq(method = "GET"): NextApiRequest {
  return { method } as NextApiRequest;
}

function makeRes() {
  const r = {
    _status: 200, _json: {} as unknown,
    status(c: number) { this._status = c; return this; },
    json(d: unknown) { this._json = d; return this; },
    end() { return this; },
  };
  return r as unknown as NextApiResponse & { _status: number; _json: unknown };
}

describe("GET /api/stories/library", () => {
  let mockLimit: jest.Mock;
  let mockCreateSignedUrl: jest.Mock;

  beforeEach(() => {
    mockCreateSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: "https://cdn.example.com/img.webp" } });
    mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

    mockServiceDb.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({ limit: mockLimit }),
          }),
        }),
      }),
      storage: {
        from: jest.fn().mockReturnValue({ createSignedUrl: mockCreateSignedUrl }),
      },
    } as ReturnType<typeof serviceDb>);

    mockGetUser.mockResolvedValue(MOCK_USER as any);
  });

  afterEach(() => jest.clearAllMocks());

  it("returns 405 for non-GET requests", async () => {
    const res = makeRes();
    await handler(makeReq("POST"), res);
    expect(res._status).toBe(405);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockImplementation(async (_req, res) => {
      (res as any).status(401).json({ error: "Unauthorized" });
      return null;
    });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(401);
  });

  it("returns empty array when user has no stories", async () => {
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._json).toEqual({ stories: [] });
  });

  it("resolves signed URLs for story images", async () => {
    mockLimit.mockResolvedValue({
      data: [{
        id: "s1", title: "My Story", author_name: "Dad",
        pages: { "1": "text" }, rhyme_scheme: "AABB", word_count: 80,
        illustrated_story: { cover: "a lion" },
        image_paths: { cover: "user-1/s1/cover.webp" },
        age_group: "4-6", prompt: "lion story", created_at: "2026-01-01T00:00:00Z",
      }],
      error: null,
    });

    const res = makeRes();
    await handler(makeReq(), res);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-1/s1/cover.webp", 3600);
    const { stories } = res._json as { stories: Array<{ imageUrls: Record<string, string>; id: string }> };
    expect(stories).toHaveLength(1);
    expect(stories[0].imageUrls.cover).toBe("https://cdn.example.com/img.webp");
    expect(stories[0].id).toBe("s1");
  });

  it("strips image_paths from response, exposes imageUrls instead", async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: "s1", title: "T", author_name: "", pages: {}, rhyme_scheme: "AABB",
        word_count: 0, illustrated_story: {}, image_paths: { cover: "path" },
        age_group: "4-6", prompt: "", created_at: "2026-01-01T00:00:00Z" }],
      error: null,
    });
    const res = makeRes();
    await handler(makeReq(), res);
    const story = (res._json as { stories: Record<string, unknown>[] }).stories[0];
    expect(story.image_paths).toBeUndefined();
    expect(story.imageUrls).toBeDefined();
  });

  it("returns 500 on DB error", async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: "DB failure" } });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(500);
  });
});
