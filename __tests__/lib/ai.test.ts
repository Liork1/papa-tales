import { generateStory } from "@/lib/ai";
import type { Story } from "@/types/stories";

// ── env setup ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
});

afterAll(() => {
  delete process.env.OPENROUTER_API_KEY;
});

// ── fixtures ──────────────────────────────────────────────────────────────────

const VALID_STORY_JSON = JSON.stringify({
  title: "כוכב קטן",
  pages: { "1": "עמוד ראשון", "2": "עמוד שני" },
  rhymeScheme: "AABB",
  themes: ["חברות"],
  illustrated_story: {
    cover: "A warm cover image.",
    "1": "Scene for page 1.",
    "2": "Scene for page 2.",
  },
});

function mockFetch(content: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: () =>
      Promise.resolve(
        JSON.stringify({ choices: [{ message: { content } }] })
      ),
  } as unknown as Response);
}

function captureSystemPrompt(): string {
  const call = (global.fetch as jest.Mock).mock.calls[0];
  const body = JSON.parse(call[1].body as string) as {
    messages: Array<{ role: string; content: string }>;
  };
  return body.messages.find((m) => m.role === "system")?.content ?? "";
}

const NO_STORIES: Story[] = [];

// ── age group → LLM system prompt ─────────────────────────────────────────────

describe("generateStory() — age group in LLM prompt", () => {
  beforeEach(() => mockFetch(VALID_STORY_JSON));
  afterEach(() => jest.resetAllMocks());

  describe.each([
    ["2-4", "6-8",  40],
    ["4-6", "8-10", 55],
    ["6-8", "10-12", 70],
    ["8-10", "10-12", 90],
  ] as const)(
    "age group %s",
    (ageGroup, expectedPageRange, expectedMaxWords) => {
      async function generate() {
        await generateStory({
          prompt: "ספר על ילד",
          inspirationalStories: NO_STORIES,
          ageGroup,
        });
        return captureSystemPrompt();
      }

      it("includes the age group value in the prompt", async () => {
        expect(await generate()).toContain(ageGroup);
      });

      it("addresses the audience by its specific age range", async () => {
        expect(await generate()).toContain(`ages ${ageGroup}`);
      });

      it(`requests ${expectedPageRange} pages`, async () => {
        expect(await generate()).toContain(`EXACTLY ${expectedPageRange} pages`);
      });

      it(`caps each page at ${expectedMaxWords} words`, async () => {
        expect(await generate()).toContain(`maximum ${expectedMaxWords} words`);
      });
    }
  );

  it("defaults to the 4-6 age group when ageGroup is omitted", async () => {
    await generateStory({ prompt: "ספר על ילד", inspirationalStories: NO_STORIES });
    const prompt = captureSystemPrompt();
    expect(prompt).toContain("ages 4-6");
    expect(prompt).toContain("EXACTLY 8-10 pages");
    expect(prompt).toContain("maximum 55 words");
  });
});
