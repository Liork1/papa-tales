import { buildInspirationContext, validateGeneratedStory } from "@/lib/stories";
import type { Story } from "@/types/stories";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "1",
    title: "כוכב קטן",
    content: "היה פעם כוכב קטן שאהב לשיר.",
    theme: "self-confidence",
    ageGroup: "4-6",
    keywords: ["כוכב", "שיר"],
    rhymeScheme: "AABB",
    language: "he",
    wordCount: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ── buildInspirationContext ───────────────────────────────────────────────────

describe("buildInspirationContext()", () => {
  it("returns a fallback string when passed an empty array", () => {
    expect(buildInspirationContext([])).toBe("אין סיפורי השראה זמינים");
  });

  it("includes the story title in the output", () => {
    const result = buildInspirationContext([makeStory({ title: "כוכב קטן" })]);
    expect(result).toContain("כוכב קטן");
  });

  it("includes the theme when present", () => {
    const result = buildInspirationContext([makeStory({ theme: "friendship" })]);
    expect(result).toContain("friendship");
  });

  it("includes the age group when present", () => {
    const result = buildInspirationContext([makeStory({ ageGroup: "4-6" })]);
    expect(result).toContain("4-6");
  });

  it("numbers multiple stories starting at 1", () => {
    const result = buildInspirationContext([makeStory(), makeStory({ id: "2", title: "דובי" })]);
    expect(result).toContain("[1]");
    expect(result).toContain("[2]");
  });

  it("truncates content to 500 chars", () => {
    const longContent = "א".repeat(600);
    const result = buildInspirationContext([makeStory({ content: longContent })]);
    // The included slice should be at most 500 chars from the content
    const contentPart = result.split("\n").slice(1).join("\n");
    expect(contentPart.length).toBeLessThanOrEqual(510); // a little slack for surrounding text
  });

  it("separates multiple stories with a divider", () => {
    const result = buildInspirationContext([makeStory(), makeStory({ id: "2" })]);
    expect(result).toContain("---");
  });
});

// ── validateGeneratedStory ────────────────────────────────────────────────────

describe("validateGeneratedStory()", () => {
  const valid = {
    story: "היה פעם ילד",
    title: "ילד קטן",
    rhymeScheme: "AABB",
  };

  it("returns true for a valid story object", () => {
    expect(validateGeneratedStory(valid)).toBe(true);
  });

  it("returns false for null", () => {
    expect(validateGeneratedStory(null)).toBe(false);
  });

  it("returns false for a non-object", () => {
    expect(validateGeneratedStory("string")).toBe(false);
    expect(validateGeneratedStory(42)).toBe(false);
  });

  it("returns false when story field is missing", () => {
    expect(validateGeneratedStory({ title: "כ", rhymeScheme: "AABB" })).toBe(false);
  });

  it("returns false when story is an empty string", () => {
    expect(validateGeneratedStory({ ...valid, story: "   " })).toBe(false);
  });

  it("returns false when title is missing", () => {
    expect(validateGeneratedStory({ story: "היה פעם", rhymeScheme: "AABB" })).toBe(false);
  });

  it("returns false when title is empty", () => {
    expect(validateGeneratedStory({ ...valid, title: "" })).toBe(false);
  });

  it("returns false for an unknown rhyme scheme", () => {
    expect(validateGeneratedStory({ ...valid, rhymeScheme: "XXYY" })).toBe(false);
  });

  it.each(["AABB", "ABAB", "ABCB", "ABBA"] as const)(
    "returns true for valid rhyme scheme %s",
    (scheme) => {
      expect(validateGeneratedStory({ ...valid, rhymeScheme: scheme })).toBe(true);
    }
  );
});

// ── getContextualStories (mocked DB) ─────────────────────────────────────────

jest.mock("@/lib/supabase", () => ({
  getStories: jest.fn(),
  getRandomStories: jest.fn(),
}));

import { getContextualStories } from "@/lib/stories";
import * as supabaseLib from "@/lib/supabase";

const mockGetStories = supabaseLib.getStories as jest.Mock;
const mockGetRandomStories = supabaseLib.getRandomStories as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getContextualStories()", () => {
  it("returns stories from the DB pool up to the limit", async () => {
    const pool = [makeStory(), makeStory({ id: "2" }), makeStory({ id: "3" })];
    mockGetStories.mockResolvedValue(pool);

    const result = await getContextualStories({}, 3);
    expect(result).toHaveLength(3);
  });

  it("falls back to random stories when the pool is empty", async () => {
    mockGetStories.mockResolvedValue([]);
    const randoms = [makeStory({ id: "r1" }), makeStory({ id: "r2" })];
    mockGetRandomStories.mockResolvedValue(randoms);

    const result = await getContextualStories({}, 2);
    expect(mockGetRandomStories).toHaveBeenCalledWith(2);
    expect(result).toEqual(randoms);
  });

  it("re-ranks results by keyword relevance", async () => {
    const unrelated = makeStory({ id: "u", title: "ילד", keywords: [] });
    const relevant = makeStory({ id: "r", title: "כוכב", keywords: ["כוכב"] });
    mockGetStories.mockResolvedValue([unrelated, relevant]);

    const result = await getContextualStories({ keywords: ["כוכב"] }, 2);
    expect(result[0].id).toBe("r");
  });

  it("fills remaining slots with random stories when pool is smaller than limit", async () => {
    mockGetStories.mockResolvedValue([makeStory()]);
    const extras = [makeStory({ id: "e1" }), makeStory({ id: "e2" })];
    mockGetRandomStories.mockResolvedValue(extras);

    const result = await getContextualStories({}, 3);
    expect(result).toHaveLength(3);
  });

  it("does not include duplicate stories when filling from random", async () => {
    const poolStory = makeStory({ id: "shared" });
    mockGetStories.mockResolvedValue([poolStory]);
    // getRandomStories returns a duplicate and a fresh one
    mockGetRandomStories.mockResolvedValue([
      poolStory,
      makeStory({ id: "fresh" }),
    ]);

    const result = await getContextualStories({}, 2);
    const ids = result.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
