import { authFetch } from "@/lib/auth-fetch";
import { getAuthClient } from "@/lib/auth";

jest.mock("@/lib/auth");

const mockGetAuthClient = getAuthClient as jest.MockedFunction<typeof getAuthClient>;

describe("authFetch", () => {
  let mockGetSession: jest.Mock;
  let mockRefreshSession: jest.Mock;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockGetSession = jest.fn();
    mockRefreshSession = jest.fn();
    mockGetAuthClient.mockReturnValue({
      auth: { getSession: mockGetSession, refreshSession: mockRefreshSession },
    } as ReturnType<typeof getAuthClient>);
    mockFetch = jest.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => jest.clearAllMocks());

  const farExpiry = () => Math.floor(Date.now() / 1000) + 3600;
  const nearExpiry = () => Math.floor(Date.now() / 1000) + 30;

  it("attaches Bearer token from session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok123", expires_at: farExpiry() } } });
    await authFetch("/api/test");
    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
    }));
  });

  it("omits Authorization header when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await authFetch("/api/test");
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("proactively refreshes token expiring within 60 s", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "old", expires_at: nearExpiry() } } });
    mockRefreshSession.mockResolvedValue({ data: { session: { access_token: "new", expires_at: farExpiry() } } });
    await authFetch("/api/test");
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer new");
  });

  it("does not refresh a token that expires well in the future", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "valid", expires_at: farExpiry() } } });
    await authFetch("/api/test");
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("passes method and body through to fetch", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "t", expires_at: farExpiry() } } });
    await authFetch("/api/test", { method: "POST", body: JSON.stringify({ x: 1 }) });
    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ x: 1 }),
    }));
  });

  it("merges caller-provided headers with Authorization", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "tok", expires_at: farExpiry() } } });
    await authFetch("/api/test", { headers: { "Content-Type": "application/json" } });
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer tok");
  });
});
