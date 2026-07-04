import React from "react";
import { render, screen, act } from "@testing-library/react";

// ── Module mocks ───────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), query: {}, isReady: true }),
}));

jest.mock("next/head", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/user-context", () => ({ useUserContext: jest.fn() }));

jest.mock("@/lib/auth", () => ({
  getAuthClient: () => ({
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
  }),
}));

// Silence fetch — admin page calls /api/admin/* on mount
global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as jest.Mock;

import { useUserContext } from "@/lib/user-context";
import AdminPage from "@/pages/admin/index";

const mockUseUserContext = useUserContext as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("AdminPage — auth context loading state", () => {
  it("shows a loading spinner while the auth context is not ready", () => {
    mockUseUserContext.mockReturnValue({
      user: null, role: "user", ready: false,
    });

    const { container } = render(<AdminPage />);

    // The spinner is the only rendered element — no dashboard content
    const spinner = container.querySelector("div > div");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Admin console/i)).not.toBeInTheDocument();
  });

  it("renders nothing (and does not redirect) while context is not ready, even with no user", () => {
    mockUseUserContext.mockReturnValue({
      user: null, role: "user", ready: false,
    });

    render(<AdminPage />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("returns null and does not show the spinner once ready with a non-admin user", () => {
    mockUseUserContext.mockReturnValue({
      user: { id: "u1", email: "user@example.com", user_metadata: {} },
      role: "user",
      ready: true,
    });

    const { container } = render(<AdminPage />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the admin dashboard when context is ready and role is admin", async () => {
    mockUseUserContext.mockReturnValue({
      user: { id: "u1", email: "admin@example.com", user_metadata: { display_name: "Admin" } },
      role: "admin",
      ready: true,
    });

    await act(async () => {
      render(<AdminPage />);
    });

    // The page-level heading "Dashboard" appears in the top bar — confirm dashboard rendered
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
