import { render, screen, fireEvent } from "@testing-library/react";
import LangSwitcher from "@/components/LangSwitcher";
import { useRouter } from "next/router";

// Override the global router mock (jest.setup.ts) to add locale support
const mockPush = jest.fn();
jest.mock("next/router", () => ({ useRouter: jest.fn() }));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

beforeEach(() => {
  mockPush.mockClear();
  mockUseRouter.mockReturnValue({
    locale: "he",
    pathname: "/",
    asPath: "/",
    query: {},
    route: "/",
    push: mockPush,
    replace: jest.fn(),
    isReady: true,
  } as ReturnType<typeof useRouter>);

  // Ensure cookie is writable
  Object.defineProperty(document, "cookie", { writable: true, value: "" });
});

describe("LangSwitcher", () => {
  it("renders the toggle button", () => {
    render(<LangSwitcher variant="light" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText(/🌐/)).toBeInTheDocument();
  });

  it("dropdown is closed by default", () => {
    render(<LangSwitcher variant="light" />);
    expect(screen.queryByText("עברית")).not.toBeInTheDocument();
    expect(screen.queryByText("English")).not.toBeInTheDocument();
  });

  it("opens dropdown on button click", () => {
    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("עברית")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("closes dropdown when a language is selected", () => {
    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button")); // open
    fireEvent.click(screen.getByText("English")); // pick
    expect(screen.queryByText("עברית")).not.toBeInTheDocument();
  });

  it("calls router.push with correct locale when switching to English", () => {
    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("English"));
    expect(mockPush).toHaveBeenCalledWith("/", "/", { locale: "en" });
  });

  it("calls router.push with Hebrew locale when switching to Hebrew", () => {
    mockUseRouter.mockReturnValue({
      locale: "en", pathname: "/", asPath: "/", query: {}, route: "/",
      push: mockPush, replace: jest.fn(), isReady: true,
    } as ReturnType<typeof useRouter>);

    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("עברית"));
    expect(mockPush).toHaveBeenCalledWith("/", "/", { locale: "he" });
  });

  it("sets NEXT_LOCALE cookie when language is picked", () => {
    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("English"));
    expect(document.cookie).toContain("NEXT_LOCALE=en");
  });

  it("applies light variant button styles", () => {
    render(<LangSwitcher variant="light" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ background: "#f3eefb", color: "#5b37b7" });
  });

  it("applies dark variant button styles", () => {
    render(<LangSwitcher variant="dark" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveStyle({ background: "rgba(255,255,255,.1)" });
  });

  it("highlights active language in dropdown", () => {
    render(<LangSwitcher variant="light" />);
    fireEvent.click(screen.getByRole("button"));
    // The active lang (he) button should have fontWeight 700
    const heButton = screen.getByText("עברית");
    expect(heButton).toHaveStyle({ fontWeight: 700 });
  });
});
