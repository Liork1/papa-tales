import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/router", () => ({
  useRouter: () => ({ replace: jest.fn(), query: {}, isReady: true }),
}));

jest.mock("next/head", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

jest.mock("@/lib/auth", () => ({
  signInWithGoogle: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithEmail: jest.fn(),
  sendPasswordReset: jest.fn(),
  getSession: jest.fn().mockResolvedValue(null),
}));

import * as auth from "@/lib/auth";
import AuthPage from "@/pages/auth";

const mockSignInWithGoogle = auth.signInWithGoogle as jest.Mock;
const mockSignUpWithEmail = auth.signUpWithEmail as jest.Mock;
const mockSignInWithEmail = auth.signInWithEmail as jest.Mock;
const mockSendPasswordReset = auth.sendPasswordReset as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (auth.getSession as jest.Mock).mockResolvedValue(null);
});

describe("Auth page — register mode (default)", () => {
  it("renders the register form by default", () => {
    render(<AuthPage />);
    expect(screen.getByRole("heading", { name: /יצירת חשבון/i })).toBeInTheDocument();
  });

  it("shows the Google sign-up button", () => {
    render(<AuthPage />);
    expect(screen.getByRole("button", { name: /הרשמה עם Google/i })).toBeInTheDocument();
  });

  it("shows email, password and display-name fields", () => {
    render(<AuthPage />);
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/איך לפנות אליך/i)).toBeInTheDocument();
  });

  it("shows the terms checkbox", () => {
    render(<AuthPage />);
    expect(screen.getByText(/תנאי השימוש/i)).toBeInTheDocument();
  });

  it("CTA button is disabled until terms are accepted and fields are filled", async () => {
    render(<AuthPage />);
    const cta = screen.getByRole("button", { name: /יצירת חשבון/i });
    expect(cta).toBeDisabled();
  });

  it("calls signInWithGoogle when Google button is clicked", async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows an error banner when signUpWithEmail returns an error", async () => {
    mockSignUpWithEmail.mockResolvedValue({ error: "אימייל כבר קיים" });
    render(<AuthPage />);

    await userEvent.type(screen.getByPlaceholderText("name@example.com"), "a@b.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");

    // Accept terms — onClick lives on the first <span> inside the label, not the label itself
    const checkboxSpan = screen.getByText(/תנאי השימוש/i).closest("label")!.querySelector("span")!;
    await userEvent.click(checkboxSpan);

    await userEvent.click(screen.getByRole("button", { name: /יצירת חשבון/i }));

    await waitFor(() => {
      expect(screen.getByText("אימייל כבר קיים")).toBeInTheDocument();
    });
  });

  it("toggles to sign-in mode when the toggle link is clicked", async () => {
    render(<AuthPage />);
    await userEvent.click(screen.getByRole("button", { name: /כניסה/i }));
    expect(screen.getByRole("heading", { name: /כניסה לחשבון/i })).toBeInTheDocument();
  });
});

describe("Auth page — sign-in mode", () => {
  function renderSignIn() {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: /כניסה/i }));
  }

  it("renders sign-in heading", () => {
    renderSignIn();
    expect(screen.getByRole("heading", { name: /כניסה לחשבון/i })).toBeInTheDocument();
  });

  it("shows the Google sign-in button", () => {
    renderSignIn();
    expect(screen.getByRole("button", { name: /המשך עם Google/i })).toBeInTheDocument();
  });

  it("does not show the display-name or terms fields in sign-in mode", () => {
    renderSignIn();
    expect(screen.queryByPlaceholderText(/איך לפנות אליך/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/תנאי השימוש/i)).not.toBeInTheDocument();
  });

  it("shows the forgot-password button", () => {
    renderSignIn();
    expect(screen.getByRole("button", { name: /שכחתי סיסמה/i })).toBeInTheDocument();
  });

  it("calls signInWithEmail with the entered credentials", async () => {
    mockSignInWithEmail.mockResolvedValue({ error: null });
    renderSignIn();

    await userEvent.type(screen.getByPlaceholderText("name@example.com"), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "mypassword");
    await userEvent.click(screen.getByRole("button", { name: /כניסה/i }));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith("user@test.com", "mypassword");
    });
  });

  it("shows error message when signInWithEmail returns an error", async () => {
    mockSignInWithEmail.mockResolvedValue({ error: "סיסמה שגויה" });
    renderSignIn();

    await userEvent.type(screen.getByPlaceholderText("name@example.com"), "user@test.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /כניסה/i }));

    await waitFor(() => {
      expect(screen.getByText("סיסמה שגויה")).toBeInTheDocument();
    });
  });

  it("shows confirmation text after forgot-password is sent", async () => {
    mockSendPasswordReset.mockResolvedValue({ error: null });
    renderSignIn();

    await userEvent.type(screen.getByPlaceholderText("name@example.com"), "user@test.com");
    await userEvent.click(screen.getByRole("button", { name: /שכחתי סיסמה/i }));

    await waitFor(() => {
      expect(screen.getByText(/קישור שחזור נשלח/i)).toBeInTheDocument();
    });
  });

  it("shows an error when forgot-password is clicked without an email", async () => {
    renderSignIn();
    await userEvent.click(screen.getByRole("button", { name: /שכחתי סיסמה/i }));
    await waitFor(() => {
      expect(screen.getByText(/הכניסו אימייל/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests that guard against the Xiaomi/MIUI device freeze:
//   • Google OAuth redirect silently blocked → page looks frozen, no feedback
//   • Email sign-in Supabase request hanging → loading spinner never clears
// All tests use fake timers so we can verify the 6 s / 15 s recovery paths
// without waiting real time.
// ---------------------------------------------------------------------------
describe("Auth page — mobile/MIUI freeze guard", () => {
  function renderSignIn() {
    render(<AuthPage />);
    // Toggle button in register mode is labelled "כניסה"
    fireEvent.click(screen.getByRole("button", { name: /כניסה/i }));
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // -- Google button loading state ------------------------------------------

  it("Google button shows '…' immediately after click (user sees feedback)", async () => {
    // Never resolves → stays in loading state; prevents the 6 s timer from registering
    mockSignInWithGoogle.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "…" })).toBeInTheDocument()
    );
  });

  it("Google button is disabled while loading to prevent double-submit", async () => {
    mockSignInWithGoogle.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "…" })).toBeDisabled()
    );
  });

  // -- Google redirect-blocked recovery (the Xiaomi / MIUI scenario) --------

  it("shows error and restores Google button after 6 s when redirect is blocked", async () => {
    // Resolves immediately but the browser never navigates (MIUI interception)
    mockSignInWithGoogle.mockResolvedValue(undefined);
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));

    // Let the resolved signInWithGoogle() promise settle so the 6 s timer gets registered
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(6100);
    });

    await waitFor(() =>
      expect(screen.getByText(/כניסה עם Google נכשלה/i)).toBeInTheDocument()
    );
    // Button label restored — user can retry or switch to email
    expect(screen.getByRole("button", { name: /הרשמה עם Google/i })).not.toBeDisabled();
  });

  it("shows error immediately when signInWithGoogle throws (network failure)", async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error("network error"));
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));

    await waitFor(() =>
      expect(screen.getByText(/כניסה עם Google נכשלה/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /הרשמה עם Google/i })).not.toBeDisabled();
  });

  // -- Cross-button locking -------------------------------------------------

  it("disables email CTA while Google sign-in is in flight (cross-submit guard)", async () => {
    mockSignInWithGoogle.mockReturnValue(new Promise(() => {}));
    render(<AuthPage />);

    // Fill form so CTA becomes enabled
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "password123" } });
    const checkboxSpan = screen.getByText(/תנאי השימוש/i).closest("label")!.querySelector("span")!;
    fireEvent.click(checkboxSpan);
    expect(screen.getByRole("button", { name: /יצירת חשבון/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /הרשמה עם Google/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /יצירת חשבון/i })).toBeDisabled()
    );
  });

  it("disables Google button while email sign-in is in progress", async () => {
    mockSignInWithEmail.mockReturnValue(new Promise(() => {}));
    renderSignIn();

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^כניסה$/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /המשך עם Google/i })).toBeDisabled()
    );
  });

  // -- Email sign-in 15 s timeout recovery ----------------------------------

  it("shows timeout error and re-enables sign-in button after 15 s of no response", async () => {
    mockSignInWithEmail.mockReturnValue(new Promise(() => {})); // hangs forever
    renderSignIn();

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "u@t.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^כניסה$/i }));

    // Let handleSubmit's initial state updates settle before advancing the clock
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(15100);
    });

    await waitFor(() =>
      expect(screen.getByText(/הפעולה ארכה זמן רב/i)).toBeInTheDocument()
    );
    // Loading cleared — user can retry
    expect(screen.getByRole("button", { name: /^כניסה$/i })).not.toBeDisabled();
  });
});
