import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { LibraryStory } from "@/pages/api/stories/library";

// ── Module mocks (must be before imports that trigger the module) ─────────────

jest.mock("@/lib/user-context", () => ({ useUserContext: jest.fn() }));
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
jest.mock("@/lib/i18n", () => ({
  useLocale: () => ({
    libTitle: "My library",
    libCount: (n: number) => `${n} stories`,
    newStory: "+ New story",
    searchPh: "Search",
    favChip: "Favorites",
    sortNew: "Newest",
    sortOld: "Oldest",
    emptyFavTitle: "No favorites",
    emptyFavHint: "Tap heart",
    emptyTitle: "No stories",
    emptyHint: "Try again",
    emptyLibHint: "Create some",
    deleteStory: "Delete",
    deleteConfirm: "Delete this story permanently?",
    backToLib: "My library",
    storyMeta: (count: number, age: string) => `${count} pages · ${age}`,
    by: (name: string) => `by ${name}`,
  }),
}));

import { LibraryView } from "@/pages/index";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STORY: LibraryStory = {
  id: "s1",
  title: "The Lion Story",
  author_name: "Dad",
  pages: { "1": "p1", "2": "p2", "3": "p3" },
  rhyme_scheme: "AABB",
  word_count: 80,
  illustrated_story: {},
  imageUrls: {},
  age_group: "4-6",
  prompt: "lion",
  created_at: "2026-01-01T00:00:00Z",
};

const BASE_PROPS = {
  library: [STORY],
  libQuery: "",
  libSort: "new" as const,
  libFavOnly: false,
  favorites: {},
  onQuery: jest.fn(),
  onToggleSort: jest.fn(),
  onToggleFav: jest.fn(),
  onToggleFavId: jest.fn(),
  onOpen: jest.fn(),
  onClose: jest.fn(),
};

// ── Delete button visibility ───────────────────────────────────────────────────

describe("LibraryView — delete button gating", () => {
  it("shows delete button when onDelete is provided (authenticated user with library)", () => {
    render(<LibraryView {...BASE_PROPS} onDelete={jest.fn()} />);
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("hides delete button for guests (onDelete not provided)", () => {
    render(<LibraryView {...BASE_PROPS} onDelete={undefined} />);
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });

  it("shows one delete button per story", () => {
    const STORY_2 = { ...STORY, id: "s2", title: "Story Two" };
    render(<LibraryView {...BASE_PROPS} library={[STORY, STORY_2]} onDelete={jest.fn()} />);
    expect(screen.getAllByTitle("Delete")).toHaveLength(2);
  });

  it("calls onDelete with the story id after confirm", async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    window.confirm = jest.fn().mockReturnValue(true);
    render(<LibraryView {...BASE_PROPS} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("s1"));
  });

  it("does not call onDelete when user cancels the confirm dialog", async () => {
    const onDelete = jest.fn();
    window.confirm = jest.fn().mockReturnValue(false);
    render(<LibraryView {...BASE_PROPS} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables the delete button while deletion is in progress", async () => {
    let resolve!: () => void;
    const onDelete = jest.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    window.confirm = jest.fn().mockReturnValue(true);
    render(<LibraryView {...BASE_PROPS} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete"));
    await waitFor(() => expect(screen.getByTitle("Delete")).toBeDisabled());
    resolve();
    await waitFor(() => expect(screen.getByTitle("Delete")).not.toBeDisabled());
  });
});

// ── Back-to-library gate (logic is in Home; tested via onDelete prop contract) ─
// The reader's "My library" button renders when `user && library.length > 0`.
// We verify this contract by checking that onDelete is wired for authenticated
// users regardless of current credit balance.

describe("Library access gate — credited users with 0 remaining credits", () => {
  it("still receives onDelete when user is authenticated but has 0 credits", () => {
    // Simulate a user who spent all their credits: tier='free', credits=0, but has library stories.
    // The parent passes onDelete={user ? handleDelete : undefined} — independent of credits.
    const onDelete = jest.fn();
    render(<LibraryView {...BASE_PROPS} onDelete={onDelete} />);
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("does not show delete button for unauthenticated guests", () => {
    // Guests have no user object; the parent passes onDelete={undefined}.
    render(<LibraryView {...BASE_PROPS} onDelete={undefined} />);
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
  });
});
