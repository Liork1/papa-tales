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
  it("returns 200 with status ok", () => {
    const req = {} as NextApiRequest;
    const res = makeRes();
    handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ status: "ok", service: "papa-tales" });
  });
});
