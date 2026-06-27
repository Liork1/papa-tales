import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import { createClient } from "@supabase/supabase-js";

jest.mock("@supabase/supabase-js");

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function makeReq(token?: string): NextApiRequest {
  return { headers: { authorization: token ? `Bearer ${token}` : undefined } } as unknown as NextApiRequest;
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

describe("requireAdmin", () => {
  let mockGetUser: jest.Mock;
  let mockSelect: jest.Mock;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

    mockGetUser = jest.fn();
    mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: "user" } }),
      }),
    });

    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: jest.fn().mockReturnValue({ select: mockSelect }),
    } as ReturnType<typeof createClient>);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns 401 when no Authorization header", async () => {
    const res = makeRes();
    expect(await requireAdmin(makeReq(), res)).toBeNull();
    expect(res._status).toBe(401);
  });

  it("returns 401 when getUser fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("bad token") });
    const res = makeRes();
    expect(await requireAdmin(makeReq("bad-token"), res)).toBeNull();
    expect(res._status).toBe(401);
  });

  it("returns 403 when user role is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } }, error: null });
    const res = makeRes();
    expect(await requireAdmin(makeReq("valid-token"), res)).toBeNull();
    expect(res._status).toBe(403);
  });

  it("returns user id when user has admin role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null });
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: "admin" } }),
      }),
    });
    const res = makeRes();
    expect(await requireAdmin(makeReq("admin-token"), res)).toBe("uid-admin");
    expect(res._status).toBe(200); // untouched
  });
});
