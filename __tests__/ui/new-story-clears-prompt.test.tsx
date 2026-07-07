import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { authFetch } from "@/lib/auth-fetch";

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("next/router", () => ({
  useRouter: () => ({
    locale: "en",
    query: {},
    pathname: "/",
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@/lib/user-context", () => ({
  useUserContext: () => ({
    user: null,
    tier: "guest" as const,
    credits: 0,
    profile: null,
    role: "user",
    ready: true,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/auth", () => ({ signOut: jest.fn() }));
jest.mock("@/lib/auth-fetch", () => ({ authFetch: jest.fn() }));
jest.mock("@/components/UpgradeModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/SuccessModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/TierComparisonModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/LangSwitcher", () => ({ __esModule: true, default: () => null }));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
jest.mock("next/head", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/lib/i18n", () => ({
  useLocale: () => require("@/locales/en").default,
}));

import Home from "@/pages/index";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAuthFetch = authFetch as jest.Mock;

const STORY_RESPONSE = {
  success: true,
  data: {
    title: "The Lion and the Star",
    pages: { "1": "Page one text here.", "2": "Page two text here." },
    rhymeScheme: "AABB",
    wordCount: 40,
    illustratedStory: { cover: "A lion under the stars" },
    usedCredit: false,
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Guest hasn't used today's story — prevents the daily-limit screen
  jest.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

  // Image generation isn't the focus of this test — let it fail silently
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ success: false }),
  });

  Object.defineProperty(window, "speechSynthesis", {
    value: { cancel: jest.fn() },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("New story prompt clearing", () => {
  test("clears the prompt textarea when New Story is clicked from the reading phase", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(STORY_RESPONSE),
    });

    render(<Home />);

    // Type a prompt into the story textarea (distinguished from the author input by a unique placeholder substring)
    const textarea = screen.getByPlaceholderText(/a little girl who flew/i);
    fireEvent.change(textarea, { target: { value: "A lion befriends a little star" } });
    expect(textarea).toHaveValue("A lion befriends a little star");

    // Click the generate button
    const genBtn = screen.getByRole("button", { name: /Create a basic story/i });
    fireEvent.click(genBtn);

    // Wait for the reading phase — the "New story" button appears in the reader header
    const newStoryBtn = await waitFor(() =>
      screen.getByRole("button", { name: /^New story$/i })
    );

    // Click "New story"
    fireEvent.click(newStoryBtn);

    // The form reappears — story textarea must be empty
    await waitFor(() => {
      const freshTextarea = screen.getByPlaceholderText(/a little girl who flew/i);
      expect(freshTextarea).toHaveValue("");
    });
  });
});
