import type { NextApiRequest, NextApiResponse } from "next";

jest.mock("@/lib/api-auth", () => ({
  getRequestUser: jest.fn(),
  serviceDb: jest.fn(),
}));

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomUUID: jest.fn().mockReturnValue("fixed-uuid-1234"),
}));

import handler from "@/pages/api/stories/save";
import { getRequestUser, serviceDb } from "@/lib/api-auth";

const mockGetUser = getRequestUser as jest.MockedFunction<typeof getRequestUser>;
const mockServiceDb = serviceDb as jest.MockedFunction<typeof serviceDb>;

const MOCK_USER = { id: "user-abc" };

const VALID_BODY = {
  story: {
    title: "The Lion",
    pages: { "1": "Once upon a time..." },
    rhymeScheme: "AABB",
    wordCount: 50,
    illustratedStory: { cover: "a lion in forest" },
  },
  authorName: "Dad",
  ageGroup: "4-6",
  prompt: "a story about a lion",
  images: {},
};

function makeReq(method = "POST", body: unknown = VALID_BODY): NextApiRequest {
  return { method, body } as unknown as NextApiRequest;
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

describe("POST /api/stories/save", () => {
  let mockUpload: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSingle: jest.Mock;

  beforeEach(() => {
    mockUpload = jest.fn().mockResolvedValue({ error: null });
    mockSingle = jest.fn().mockResolvedValue({ data: { id: "fixed-uuid-1234" }, error: null });
    mockInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });

    mockServiceDb.mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: mockInsert }),
      storage: { from: jest.fn().mockReturnValue({ upload: mockUpload }) },
    } as ReturnType<typeof serviceDb>);

    mockGetUser.mockResolvedValue(MOCK_USER as any);
  });

  afterEach(() => jest.clearAllMocks());

  it("returns 405 for non-POST", async () => {
    const res = makeRes();
    await handler(makeReq("GET"), res);
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

  it("returns 400 when story data is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { ...VALID_BODY, story: null }), res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when story title is missing", async () => {
    const res = makeRes();
    await handler(makeReq("POST", { ...VALID_BODY, story: { ...VALID_BODY.story, title: "" } }), res);
    expect(res._status).toBe(400);
  });

  it("inserts story with correct fields and returns id", async () => {
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ id: "fixed-uuid-1234" });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "fixed-uuid-1234",
      user_id: "user-abc",
      title: "The Lion",
      author_name: "Dad",
      age_group: "4-6",
      used_credit: true,
    }));
  });

  it("uploads webp images to correct storage path", async () => {
    const body = { ...VALID_BODY, images: { cover: "data:image/webp;base64,AAAA" } };
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    expect(mockUpload).toHaveBeenCalledWith(
      "user-abc/fixed-uuid-1234/cover.webp",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/webp", upsert: false })
    );
  });

  it("uploads png images with correct extension", async () => {
    const body = { ...VALID_BODY, images: { p1: "data:image/png;base64,AAAA" } };
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    expect(mockUpload).toHaveBeenCalledWith(
      "user-abc/fixed-uuid-1234/p1.png",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png" })
    );
  });

  it("still saves story if image upload fails (no storage error propagation)", async () => {
    mockUpload.mockResolvedValue({ error: { message: "upload failed" } });
    const body = { ...VALID_BODY, images: { cover: "data:image/png;base64,AAAA" } };
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    expect(res._status).toBe(200);
  });

  it("returns 500 on DB insert error", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const res = makeRes();
    await handler(makeReq(), res);
    expect(res._status).toBe(500);
  });
});
