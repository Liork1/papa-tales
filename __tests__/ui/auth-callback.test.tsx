import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockReplace = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ replace: mockReplace, query: {}, isReady: true }),
}));

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
  it("renders the loading indicator", () => {
    render(<AuthCallback />);
    expect(screen.getByText("מתחבר…")).toBeInTheDocument();
  });

  it("redirects to / when onAuthStateChange fires SIGNED_IN with a session", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", { user: { id: "u1" } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("redirects to / when getSession returns an existing session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("does not redirect when SIGNED_IN fires without a session object", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", null);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await act(async () => {});
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /?auth_error=1 after the 10 s timeout when no session arrives", async () => {
    render(<AuthCallback />);

    await act(async () => {
      jest.advanceTimersByTime(10_001);
    });

    expect(mockReplace).toHaveBeenCalledWith("/?auth_error=1");
  });

  it("does not redirect to error if session arrives before the timeout", async () => {
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      cb("SIGNED_IN", { user: { id: "u1" } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    render(<AuthCallback />);

    await act(async () => {
      jest.advanceTimersByTime(10_001);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("unsubscribes from onAuthStateChange on unmount", () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const { unmount } = render(<AuthCallback />);
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
