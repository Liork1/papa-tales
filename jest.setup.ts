import "@testing-library/jest-dom";

// Silence Next.js router warnings in tests
jest.mock("next/router", () => ({
  useRouter: () => ({
    route: "/",
    pathname: "/",
    query: {},
    asPath: "/",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
  }),
}));

// Suppress console noise in tests — show errors only
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (msg: string, ...args: unknown[]) => {
    if (typeof msg === "string" && msg.includes("@supabase")) return;
    originalWarn(msg, ...args);
  };
});
afterAll(() => {
  console.warn = originalWarn;
});
