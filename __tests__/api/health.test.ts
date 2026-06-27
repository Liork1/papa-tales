import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/health";

function makeRes() {
  const res = {
    _status: 200,
    _json: {} as unknown,
    status(code: number) { this._status = code; return this; },
    json(data: unknown) { this._json = data; return this; },
  };
  return res as unknown as NextApiResponse & { _status: number; _json: unknown };
}

describe("GET /api/health", () => {
  const REQUIRED_VARS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
  ] as const;

  beforeEach(() => {
    REQUIRED_VARS.forEach((k) => { process.env[k] = "test-value"; });
  });

  afterEach(() => {
    REQUIRED_VARS.forEach((k) => { delete process.env[k]; });
  });

  it("returns 200 with status ok when all env vars are set", () => {
    const req = {} as NextApiRequest;
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ status: "ok", service: "papa-tales" });
    const json = res._json as Record<string, unknown>;
    expect(Object.values(json.env as Record<string, boolean>).every(Boolean)).toBe(true);
  });

  it("returns 500 when a required env var is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const req = {} as NextApiRequest;
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json).toMatchObject({ status: "missing_env" });
  });
});
