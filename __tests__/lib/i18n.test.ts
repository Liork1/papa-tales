import { t, messages } from "@/lib/i18n";

describe("t()", () => {
  it("resolves a top-level dotted key", () => {
    expect(t("api.errors.promptTooShort")).toBe("הנושא קצר מדי - נדרשים לפחות 10 תווים");
  });

  it("resolves a deeply nested key", () => {
    expect(t("api.errors.rateLimitExceeded")).toBe("חרגת ממגבלת הבקשות - נסה שוב בעוד שעה");
  });

  it("returns the key itself when path does not exist", () => {
    expect(t("api.errors.doesNotExist")).toBe("api.errors.doesNotExist");
  });

  it("returns the key when an intermediate segment is missing", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("returns the key when path leads to an object, not a string", () => {
    expect(t("api.errors")).toBe("api.errors");
  });

  it("resolves all documented error keys", () => {
    const errorKeys = [
      "api.errors.invalidPrompt",
      "api.errors.promptTooShort",
      "api.errors.promptTooLong",
      "api.errors.invalidAgeGroup",
      "api.errors.dbError",
      "api.errors.aiError",
      "api.errors.rateLimitExceeded",
      "api.errors.methodNotAllowed",
    ];
    for (const key of errorKeys) {
      const result = t(key);
      expect(result).not.toBe(key); // resolved to an actual Hebrew string
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("exports messages matching the he.json shape", () => {
    expect(messages.api.errors.promptTooShort).toBe(t("api.errors.promptTooShort"));
  });
});
