import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockReplace = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ replace: mockReplace, query: {}, isReady: true }),
}));

jest.mock("next/head", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const mockOnAuthStateChange = jest.fn();
const mockGetSession = jest.fn();

jest.mock("@/lib/auth", () => ({
  getAuthClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
    },
  })),
}));

jest.mock("@/lib/i18n", () => ({
  useLocale: () => ({
    authConfirmWaiting: "Confirming your email…",
    authConfirmSuccess: "✓ Welcome! Your account is confirmed",
    authConfirmSuccessHint: "You're all set. Let's create your first story…",
    authConfirmError: "Confirmation link expired or invalid",
    authConfirmErrorHint: "Try signing up again, or sign in if you already have an account.",
  }),
}));

import AuthCallback from "@/pages/auth/callback";

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Auth callback page", () => {
  it("renders in confirming state initially", () => {
    render(<AuthCallback />);
    expect(screen.getByText("Confirming your email…")).toBeInTheDocument();
  });

  it("shows success state when onAuthStateChange fires SIGNED_IN with a session", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", { user: { id: "u1" } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText("✓ Welcome! Your account is confirmed")).toBeInTheDocument();
    });
  });

  it("redirects to / after showing success state (2 second delay)", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", { user: { id: "u1" } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await act(async () => {
      await Promise.resolve();
    });

    // Should show success state
    expect(screen.getByText("✓ Welcome! Your account is confirmed")).toBeInTheDocument();

    // Advance time by 2 seconds
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Should have called replace after 2 seconds
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("shows success state when getSession returns an existing session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText("✓ Welcome! Your account is confirmed")).toBeInTheDocument();
    });
  });

  it("redirects to / when getSession returns session (2 second delay)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText("✓ Welcome! Your account is confirmed")).toBeInTheDocument();
    });

    // Advance time by 2 seconds
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("does not transition to success when SIGNED_IN fires without a session object", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", null);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await act(async () => {});
    expect(screen.queryByText("✓ Welcome! Your account is confirmed")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows error state after 10 s timeout when no session arrives", async () => {
    render(<AuthCallback />);

    // Initially shows confirming state with specific text
    expect(screen.getByText("Confirming your email…")).toBeInTheDocument();

    // Advance time past the timeout
    await act(async () => {
      jest.advanceTimersByTime(10_001);
    });

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText("Confirmation link expired or invalid")).toBeInTheDocument();
    });
  });

  it("shows try again button in error state", async () => {
    render(<AuthCallback />);

    // Advance time past the timeout
    await act(async () => {
      jest.advanceTimersByTime(10_001);
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /try again/i })).toBeInTheDocument();
    });
  });

  it("does not show error if session arrives before the 10 s timeout", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      // Simulate session arriving quickly
      setTimeout(() => cb("SIGNED_IN", { user: { id: "u1" } }), 100);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });

    // Should show success, not error
    expect(screen.getByText("✓ Welcome! Your account is confirmed")).toBeInTheDocument();
    expect(screen.queryByText(/confirmation link expired|invalid/i)).not.toBeInTheDocument();
  });

  it("unsubscribes from onAuthStateChange on unmount", () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const { unmount } = render(<AuthCallback />);
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
