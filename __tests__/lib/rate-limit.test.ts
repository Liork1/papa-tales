// Use fake timers so Date.now() is controllable and setInterval doesn't leak
jest.useFakeTimers();

// Re-require module fresh for each test to reset the in-memory store
let checkRateLimit: (id: string) => { allowed: boolean; remaining: number; resetAt: number };

beforeEach(() => {
  jest.resetModules();
  jest.setSystemTime(0);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ({ checkRateLimit } = require("@/lib/rate-limit"));
});

afterAll(() => {
  jest.useRealTimers();
});

const LIMIT = parseInt(process.env.API_RATE_LIMIT ?? "10", 10);

describe("checkRateLimit()", () => {
  it("allows the first request and returns LIMIT-1 remaining", () => {
    const result = checkRateLimit("ip-first");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(LIMIT - 1);
  });

  it("allows requests up to the limit", () => {
    const id = "ip-upto-limit";
    for (let i = 0; i < LIMIT; i++) {
      expect(checkRateLimit(id).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const id = "ip-exceed";
    for (let i = 0; i < LIMIT; i++) checkRateLimit(id);
    const result = checkRateLimit(id);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets the window after WINDOW_MS has elapsed", () => {
    const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "3600000", 10);
    const id = "ip-reset";
    for (let i = 0; i < LIMIT; i++) checkRateLimit(id);
    expect(checkRateLimit(id).allowed).toBe(false);

    // Advance past the window
    jest.setSystemTime(WINDOW_MS + 1);
    const result = checkRateLimit(id);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(LIMIT - 1);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < LIMIT; i++) checkRateLimit("ip-a");
    expect(checkRateLimit("ip-a").allowed).toBe(false);
    expect(checkRateLimit("ip-b").allowed).toBe(true);
  });

  it("decrements remaining count on each allowed request", () => {
    const id = "ip-decrement";
    for (let i = 1; i <= 3; i++) {
      const r = checkRateLimit(id);
      expect(r.remaining).toBe(LIMIT - i);
    }
  });

  it("includes a valid resetAt timestamp in the future", () => {
    const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "3600000", 10);
    jest.setSystemTime(1000);
    const result = checkRateLimit("ip-reset-at");
    expect(result.resetAt).toBeGreaterThan(1000);
    expect(result.resetAt).toBeLessThanOrEqual(1000 + WINDOW_MS);
  });
});
