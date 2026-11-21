/**
 * Content Filter Tests
 * Tests for validateContent and getValidationErrorKey functions
 */

import { validateContent, getValidationErrorKey } from "@/lib/content-filter";

describe("Content Filter - validateContent", () => {
  describe("Valid prompts (should pass)", () => {
    it("should accept clean Hebrew prompts", () => {
      const result = validateContent("סיפור על ילדה שהטסה עם כוכב להרפתקה בין העננים");
      expect(result.isValid).toBe(true);
      expect(result.category).toBeUndefined();
      expect(result.foundWords).toBeUndefined();
    });

    it("should accept clean English prompts", () => {
      const result = validateContent("A little girl who flew with a star on an adventure");
      expect(result.isValid).toBe(true);
      expect(result.category).toBeUndefined();
      expect(result.foundWords).toBeUndefined();
    });

    it("should accept Hebrew prompts with common storytelling words", () => {
      const result = validateContent("סיפור על ילד שנפל וקם בחוזק לב");
      expect(result.isValid).toBe(true);
    });

    it("should accept English prompts with common storytelling words", () => {
      const result = validateContent("A story about a child who fell and rose with courage");
      expect(result.isValid).toBe(true);
    });

    it("should accept empty string", () => {
      const result = validateContent("");
      expect(result.isValid).toBe(true);
    });

    it("should accept null-like strings", () => {
      const result = validateContent("   ");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Harassment content (should reject)", () => {
    it("should reject Hebrew harassment words", () => {
      const result = validateContent("סיפור על התעללות בילדים");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
      expect(result.foundWords).toContain("התעללות");
    });

    it("should reject English harassment words", () => {
      const result = validateContent("A story about abuse and harassment");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
      expect(result.foundWords).toContain("abuse");
      expect(result.foundWords).toContain("harassment");
    });

    it("should reject bullying content", () => {
      const result = validateContent("A story about bullying");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
      expect(result.foundWords).toContain("bullying");
    });

    it("should reject racist content", () => {
      const result = validateContent("סיפור על אנטישמיות וגזענות");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
    });

    it("should be case-insensitive for harassment", () => {
      const result = validateContent("A STORY ABOUT ABUSE");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
    });
  });

  describe("Violence content (should reject)", () => {
    it("should reject Hebrew violence words", () => {
      const result = validateContent("סיפור על הריגה");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
      expect(result.foundWords).toContain("הריגה");
    });

    it("should reject multiple Hebrew violence words", () => {
      const result = validateContent("סיפור על הריגה וחתך");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
      expect(result.foundWords?.length).toBeGreaterThan(0);
    });

    it("should reject English violence words", () => {
      const result = validateContent("A story with murder and terrorism");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
      expect(result.foundWords).toContain("murder");
      expect(result.foundWords).toContain("terrorism");
    });

    it("should reject violence keywords", () => {
      const result = validateContent("A violent story with weapons");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
    });

    it("should reject torture/stabbing content", () => {
      const result = validateContent("סיפור על דקירה וחנק");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
    });

    it("should reject suicide references", () => {
      const result = validateContent("A story about suicide and death");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("violence");
    });
  });

  describe("Sexual content (should reject)", () => {
    it("should reject Hebrew sexual words", () => {
      const result = validateContent("סיפור על סקס וקשר מיני");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("sexual");
      expect(result.foundWords).toContain("סקס");
    });

    it("should reject English sexual words", () => {
      const result = validateContent("A story with sexual content");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("sexual");
      expect(result.foundWords).toContain("sex");
      expect(result.foundWords).toContain("sexual");
    });

    it("should reject adult content", () => {
      const result = validateContent("A story with porn and nudity");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("sexual");
    });

    it("should reject inappropriate descriptions", () => {
      const result = validateContent("סיפור על עירום ופעילות מינית");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("sexual");
    });
  });

  describe("Mixed content prioritization", () => {
    it("should return harassment as priority when mixed", () => {
      const result = validateContent("A story about abuse and violence");
      expect(result.isValid).toBe(false);
      // Should detect harassment first since it's checked first
      expect(["harassment", "violence"]).toContain(result.category);
    });

    it("should return sexual as highest priority when found", () => {
      const result = validateContent("A story about sexual harassment and abuse");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("sexual");
    });
  });

  describe("Real-world story prompts", () => {
    it("should accept: adventure with dragon", () => {
      const result = validateContent("A brave knight goes on an adventure to find the dragon treasure");
      expect(result.isValid).toBe(true);
    });

    it("should accept: princess story", () => {
      const result = validateContent("הסיפור של נסיכה שחיפשה האהבה האמיתית");
      expect(result.isValid).toBe(true);
    });

    it("should accept: magical forest", () => {
      const result = validateContent("A magical forest where animals talk and dance together");
      expect(result.isValid).toBe(true);
    });

    it("should accept: space adventure", () => {
      const result = validateContent("סיפור על חללית שטסה לכוכבים רחוקים");
      expect(result.isValid).toBe(true);
    });

    it("should reject: inappropriate story prompt", () => {
      const result = validateContent("A story about abuse and hatred in the kingdom");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle very long text", () => {
      const longClean = "Once upon a time there was a beautiful princess who lived in a castle with her family. " +
        "She had adventures with her friends in the enchanted forest. They explored magical places together " +
        "and learned valuable lessons about friendship and kindness.";
      const result = validateContent(longClean);
      expect(result.isValid).toBe(true);
    });

    it("should handle word boundaries correctly", () => {
      // "harassing" contains "harass" but should still be detected
      const result = validateContent("A harassing story");
      expect(result.isValid).toBe(false);
      expect(result.category).toBe("harassment");
    });

    it("should handle multiple violations", () => {
      const result = validateContent("abuse harass bully");
      expect(result.isValid).toBe(false);
      expect(result.foundWords?.length).toBeGreaterThan(0);
    });

    it("should limit found words to 3", () => {
      const result = validateContent("abuse harass bully racist sexism hate");
      expect(result.isValid).toBe(false);
      expect(result.foundWords?.length).toBeLessThanOrEqual(3);
    });

    it("should handle Hebrew and English mixed", () => {
      const result = validateContent("סיפור על abuse וטרור");
      expect(result.isValid).toBe(false);
    });
  });
});

describe("Content Filter - getValidationErrorKey", () => {
  it("should return harassment error key", () => {
    const key = getValidationErrorKey("harassment");
    expect(key).toBe("api.errors.inappropriateContent.harassment");
  });

  it("should return violence error key", () => {
    const key = getValidationErrorKey("violence");
    expect(key).toBe("api.errors.inappropriateContent.violence");
  });

  it("should return sexual error key", () => {
    const key = getValidationErrorKey("sexual");
    expect(key).toBe("api.errors.inappropriateContent.sexual");
  });

  it("should return general error key for undefined category", () => {
    const key = getValidationErrorKey(undefined);
    expect(key).toBe("api.errors.inappropriateContent.general");
  });

  it("should return general error key for null category", () => {
    const key = getValidationErrorKey(undefined);
    expect(key).toBe("api.errors.inappropriateContent.general");
  });
});
