import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
