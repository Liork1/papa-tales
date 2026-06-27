import { render, screen, fireEvent } from "@testing-library/react";
import TierComparisonModal from "@/components/TierComparisonModal";
import { useLocale } from "@/lib/i18n";

jest.mock("@/lib/i18n");

const mockUseLocale = useLocale as jest.MockedFunction<typeof useLocale>;

const MOCK_T = {
  cmpTitle: "מה מקבלים בכל מסלול",
  cmpSub: "ככל שמתקדמים — הסיפור מקבל יותר חיים",
  fullExp: "החוויה המלאה",
  gotIt: "הבנתי",
  tierData: [
    {
      name: "אורח",
      icon: "🌙",
      quota: "סיפור בסיסי 1 בכל יום",
      premium: false,
      features: [
        { ok: true, text: "סיפור מחורז שנכתב במיוחד" },
        { ok: false, text: "איור בעמודי הפנים" },
      ],
    },
    {
      name: "חשבון חינם",
      icon: "🎁",
      quota: "5 סיפורים בסיסיים",
      premium: false,
      features: [{ ok: true, text: "כל מה שיש במצב אורח" }],
    },
    {
      name: "בעל קרדיטים",
      icon: "✦",
      quota: "חבילות מ‑3$",
      premium: true,
      features: [
        { ok: true, text: "איור צבעוני בכל עמוד" },
        { ok: true, text: "הקראה קולית" },
      ],
    },
  ],
} as ReturnType<typeof useLocale>;

describe("TierComparisonModal", () => {
  beforeEach(() => {
    mockUseLocale.mockReturnValue(MOCK_T);
  });

  it("renders title and subtitle from locale", () => {
    render(<TierComparisonModal onClose={jest.fn()} />);
    expect(screen.getByText("מה מקבלים בכל מסלול")).toBeInTheDocument();
    expect(screen.getByText("ככל שמתקדמים — הסיפור מקבל יותר חיים")).toBeInTheDocument();
  });

  it("renders all three tier names", () => {
    render(<TierComparisonModal onClose={jest.fn()} />);
    expect(screen.getByText("אורח")).toBeInTheDocument();
    expect(screen.getByText("חשבון חינם")).toBeInTheDocument();
    expect(screen.getByText("בעל קרדיטים")).toBeInTheDocument();
  });

  it("shows premium badge only on premium tier", () => {
    render(<TierComparisonModal onClose={jest.fn()} />);
    expect(screen.getByText("החוויה המלאה")).toBeInTheDocument();
    // Only one badge should exist
    expect(screen.getAllByText("החוויה המלאה")).toHaveLength(1);
  });

  it("renders feature rows with ✓ and ✕ indicators", () => {
    render(<TierComparisonModal onClose={jest.fn()} />);
    expect(screen.getByText("סיפור מחורז שנכתב במיוחד")).toBeInTheDocument();
    expect(screen.getByText("איור בעמודי הפנים")).toBeInTheDocument();
    const checks = screen.getAllByText("✓");
    const crosses = screen.getAllByText("✕");
    expect(checks.length).toBeGreaterThan(0);
    expect(crosses.length).toBeGreaterThan(0);
  });

  it("renders Got it button with locale text", () => {
    render(<TierComparisonModal onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "הבנתי" })).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = jest.fn();
    const { container } = render(<TierComparisonModal onClose={onClose} />);
    fireEvent.click(container.firstChild!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when ✕ close button is clicked", () => {
    const onClose = jest.fn();
    render(<TierComparisonModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Got it is clicked", () => {
    const onClose = jest.fn();
    render(<TierComparisonModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "הבנתי" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not propagate click from inner card to backdrop", () => {
    const onClose = jest.fn();
    render(<TierComparisonModal onClose={onClose} />);
    // Clicking the tier name (inside the card) should not close the modal
    fireEvent.click(screen.getByText("אורח"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
