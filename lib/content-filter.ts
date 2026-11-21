/**
 * Content Filter - Validates prompts and stories for inappropriate content
 * Checks for harassment, violence, and sexual content in both Hebrew and English
 */

// Inappropriate words/phrases - HARASSMENT
const HARASSMENT_WORDS_HE = [
  "מתעללת", "מתעולל", "התעללות", "אלימות",
  "השפלה", "בושת פנים", "התבזיון",
  "קללה",
  "התקפה", "הצתה", "הסתת שנאה", "הפצת שנאה",
  "אנטישמיות", "גזענות", "הומופוביה", "טרנספוביה",
  "אפליה"
];

const HARASSMENT_WORDS_EN = [
  "abuse", "harass", "bully", "bullying", "harassment", "harassing",
  "beat", "punch", "slap", "hurt", "harm",
  "humiliate", "degrade", "insult", "curse", "swear",
  "hate", "hateful", "racist", "racism", "sexism", "sexist",
  "antisemitism", "antisemitic", "homophobic", "transphobic",
  "mock", "ridicule", "tease", "taunt"
];

// Inappropriate words/phrases - VIOLENCE
const VIOLENCE_WORDS_HE = [
  "הריגה", "הרוג",
  "חתך", "פיגוע", "פיגוע טרור", "טרור", "פצע", "פצוע",
  "ציד אדם", "התנקשות", "ירי", "נשק", "אקדח", "רובה",
  "בנק דם", "הסתה", "מלחמה", "קרב",
  "אונס", "אנס", "התאבדות", "השמדה",
  "ספוגה", "דקירה", "חנק", "חנוק"
];

const VIOLENCE_WORDS_EN = [
  "murder", "killed",
  "kill", "violence", "violent", "wound", "wounded",
  "shooting", "gun", "weapon", "terror", "terrorism",
  "terrorist", "suicide", "genocid", "massacre", "slaughter",
  "brutal", "brutality", "rape", "sexual assault",
  "stab", "stabbing", "strangle", "choking", "torture",
  "war", "battle", "combat", "conflict", "destroy", "destruction"
];

// Inappropriate words/phrases - SEXUAL/ADULT
const SEXUAL_WORDS_HE = [
  "סקס", "מין", "מינס", "אונס", "אנוס", "פעילות מינית",
  "פורנו", "פורנוגרפיה", "עירום", "חשוף"
];

const SEXUAL_WORDS_EN = [
  "sex", "sexual", "porn", "pornography", "naked", "nude",
  "rape", "intercourse", "masturbat", "orgasm",
  "penis", "vagina", "erection", "breast", "boob", "butt",
  "seduction", "seduc", "adultery", "affair",
  "horny", "aroused", "cum", "jizz", "semen", "ejacul",
  "bitch", "slut", "whore", "prostitut", "pimp"
];

// All inappropriate words combined
const ALL_INAPPROPRIATE = [
  ...HARASSMENT_WORDS_HE,
  ...HARASSMENT_WORDS_EN,
  ...VIOLENCE_WORDS_HE,
  ...VIOLENCE_WORDS_EN,
  ...SEXUAL_WORDS_HE,
  ...SEXUAL_WORDS_EN
];

/**
 * Validates content for inappropriate words/phrases
 * @param text - Text to validate (Hebrew or English)
 * @returns object with isValid boolean and details
 */
export function validateContent(text: string): {
  isValid: boolean;
  category?: "harassment" | "violence" | "sexual";
  foundWords?: string[];
} {
  if (!text) return { isValid: true };

  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  let category: "harassment" | "violence" | "sexual" | undefined;

  // Check HARASSMENT words
  for (const word of HARASSMENT_WORDS_HE.concat(HARASSMENT_WORDS_EN)) {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
      if (!category) category = "harassment";
    }
  }

  // Check VIOLENCE words
  if (!category || category === "harassment") {
    for (const word of VIOLENCE_WORDS_HE.concat(VIOLENCE_WORDS_EN)) {
      if (lowerText.includes(word.toLowerCase())) {
        foundWords.push(word);
        if (!category) category = "violence";
      }
    }
  }

  // Check SEXUAL words
  if (!category || category !== "sexual") {
    for (const word of SEXUAL_WORDS_HE.concat(SEXUAL_WORDS_EN)) {
      if (lowerText.includes(word.toLowerCase())) {
        foundWords.push(word);
        category = "sexual";
      }
    }
  }

  // Remove duplicates
  const uniqueWords = [...new Set(foundWords)];

  if (uniqueWords.length > 0) {
    return {
      isValid: false,
      category,
      foundWords: uniqueWords.slice(0, 3), // Return first 3 found words
    };
  }

  return { isValid: true };
}

/**
 * Gets a user-friendly validation error message key for the i18n system
 * @param category - The violation category
 * @returns The i18n key for the error message
 */
export function getValidationErrorKey(category?: "harassment" | "violence" | "sexual"): string {
  switch (category) {
    case "harassment":
      return "api.errors.inappropriateContent.harassment";
    case "violence":
      return "api.errors.inappropriateContent.violence";
    case "sexual":
      return "api.errors.inappropriateContent.sexual";
    default:
      return "api.errors.inappropriateContent.general";
  }
}
