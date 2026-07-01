import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api-auth", () => ({
  getRequestUser: jest.fn(),
  serviceDb: jest.fn(),
}));

import handler from "@/pages/api/stories/delete";
import { getRequestUser, serviceDb } from "@/lib/api-auth";

const mockGetUser = getRequestUser as jest.MockedFunction<typeof getRequestUser>;
const mockServiceDb = serviceDb as jest.MockedFunction<typeof serviceDb>;

function makeReq(method = "DELETE", query: Record<string, string> = {}): NextApiRequest {
  return { method, query } as unknown as NextApiRequest;
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

const MOCK_USER = { id: "user-1" } as any;

const STORY_ROW = {
  id: "story-1",
  user_id: "user-1",
  image_paths: { cover: "user-1/story-1/cover.webp", "1": "user-1/story-1/1.webp" },
};

function makeMockDb(overrides: Record<string, unknown> = {}) {
  const mockRemove = jest.fn().mockResolvedValue({ error: null });
  const mockDelete = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });
  const mockSingle = jest.fn().mockResolvedValue({ data: STORY_ROW, error: null });

  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
      delete: mockDelete,
    }),
    storage: {
      from: jest.fn().mockReturnValue({ remove: mockRemove }),
    },
    _mockRemove: mockRemove,
    _mockDelete: mockDelete,
    _mockSingle: mockSingle,
    ...overrides,
  };
}

describe("DELETE /api/stories/delete", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 405 for non-DELETE requests", async () => {
    const res = makeRes();
    await handler(makeReq("GET", { id: "story-1" }), res);
    expect(res._status).toBe(405);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockImplementation(async (_req, res) => {
      (res as any).status(401).json({ error: "Unauthorized" });
      return null;
    });
    const res = makeRes();
    await handler(makeReq("DELETE", { id: "story-1" }), res);
    expect(res._status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValue(MOCK_USER);
    mockServiceDb.mockReturnValue(makeMockDb());
    const res = makeRes();
    await handler(makeReq("DELETE", {}), res);
    expect(res._status).toBe(400);
  });

  it("returns 404 when story does not belong to the user", async () => {
    mockGetUser.mockResolvedValue(MOCK_USER);
    const db = makeMockDb();
    db._mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    mockServiceDb.mockReturnValue(db);
    const res = makeRes();
    await handler(makeReq("DELETE", { id: "story-1" }), res);
    expect(res._status).toBe(404);
  });

  it("removes all image paths from storage before deleting the row", async () => {
    mockGetUser.mockResolvedValue(MOCK_USER);
    const db = makeMockDb();
    mockServiceDb.mockReturnValue(db);
    const res = makeRes();
    await handler(makeReq("DELETE", { id: "story-1" }), res);
    expect(db._mockRemove).toHaveBeenCalledWith(
      expect.arrayContaining(["user-1/story-1/cover.webp", "user-1/story-1/1.webp"])
    );
  });

  it("returns 200 on successful deletion", async () => {
    mockGetUser.mockResolvedValue(MOCK_USER);
    mockServiceDb.mockReturnValue(makeMockDb());
    const res = makeRes();
    await handler(makeReq("DELETE", { id: "story-1" }), res);
    expect(res._status).toBe(200);
    expect((res._json as { success: boolean }).success).toBe(true);
  });

  it("returns 500 when DB delete fails", async () => {
    mockGetUser.mockResolvedValue(MOCK_USER);
    const db = makeMockDb();
    db._mockDelete.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: "DB error" } }),
      }),
    });
    mockServiceDb.mockReturnValue(db);
    const res = makeRes();
    await handler(makeReq("DELETE", { id: "story-1" }), res);
    expect(res._status).toBe(500);
  });
});
