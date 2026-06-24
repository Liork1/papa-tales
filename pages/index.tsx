import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/book.module.css";
import type { GenerateStoryResponse } from "@/types/api";
import { useUserContext } from "@/lib/user-context";
import { signOut } from "@/lib/auth";
import UpgradeModal from "@/components/UpgradeModal";
import SuccessModal from "@/components/SuccessModal";

// ── Types ────────────────────────────────────────────────────────────────────

interface StoryData {
  title: string;
  pages: Record<string, string>;
  rhymeScheme: string;
  wordCount: number;
  illustratedStory: Record<string, string>;
}

type Phase = "form" | "generating" | "reading";
type ImageState = string | "loading" | "error";
type ErrorScenario = "offline" | "server" | "timeout" | "rate" | "content";

interface AppError {
  scenario: ErrorScenario;
  savedPrompt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AGE_GROUPS = [
  { value: "2-4", label: "2–4" },
  { value: "4-6", label: "4–6" },
  { value: "6-8", label: "6–8" },
  { value: "8-10", label: "8–10" },
] as const;

const STAGES = ["חושבים על הרעיון…", "כותבים בחרוזים…", "מציירים את האיורים…"];

const ACCENT = { main: "#7a4fb0", deep: "#553089", soft: "#efe6fb", ink: "#4a2d72" };

const ERROR_SCENARIOS: Record<ErrorScenario, {
  glyph: string; title: string; message: string;
  primaryLabel: string; primaryRetry: boolean;
  secondaryLabel: string | null; showPrompt: boolean;
}> = {
  offline: { glyph: "☁", title: "אין חיבור לאינטרנט", message: "לא הצלחנו להתחבר לרשת בזמן יצירת הסיפור. בדקו את החיבור ונסו שוב.", primaryLabel: "נסו שוב", primaryRetry: true, secondaryLabel: "עריכת הבקשה", showPrompt: true },
  server:  { glyph: "!", title: "משהו השתבש אצלנו", message: "נתקלנו בתקלה זמנית בזמן כתיבת הסיפור. זה כנראה זמני — אפשר לנסות שוב.", primaryLabel: "נסו שוב", primaryRetry: true, secondaryLabel: "עריכת הבקשה", showPrompt: true },
  timeout: { glyph: "⏱", title: "זה לקח יותר מדי זמן", message: "יצירת הסיפור ארכה זמן רב מהצפוי. רוצים שננסה שוב?", primaryLabel: "נסו שוב", primaryRetry: true, secondaryLabel: "עריכת הבקשה", showPrompt: true },
  rate:    { glyph: "⋯", title: "יש כרגע הרבה מבקשי סיפורים", message: "השירות עמוס לרגע. נסו שוב בעוד מספר שניות — שווה לחכות.", primaryLabel: "נסו שוב", primaryRetry: true, secondaryLabel: null, showPrompt: false },
  content: { glyph: "✎", title: "לא הצלחנו ליצור סיפור מהבקשה הזו", message: "אפשר לנסות לנסח את הבקשה קצת אחרת או להוסיף פרטים, וננסה שוב ביחד.", primaryLabel: "עריכת הבקשה", primaryRetry: false, secondaryLabel: null, showPrompt: true },
};

// 6 scene gradients cycling per page index
const SCENES = [
  { bg: "radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.9), transparent), radial-gradient(1.5px 1.5px at 72% 16%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 42% 40%, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 86% 48%, rgba(255,255,255,.7), transparent), linear-gradient(165deg,#2a1f5c 0%, #5a3a93 48%, #b56b96 100%)", gc: "#ffe9a8", gx: "50%", gy: "24%", gs: 200 },
  { bg: "radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.9), transparent), radial-gradient(1.5px 1.5px at 72% 16%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 42% 40%, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 86% 48%, rgba(255,255,255,.7), transparent), linear-gradient(180deg,#1b1640 0%, #3a2d6e 60%, #6a4a8f 100%)", gc: "#fff3c4", gx: "74%", gy: "22%", gs: 130 },
  { bg: "linear-gradient(180deg,#3a2d6e 0%, #7a5a9e 50%, #f0b9cf 100%)", gc: "#ffe9a8", gx: "30%", gy: "26%", gs: 150 },
  { bg: "radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.9), transparent), radial-gradient(1.5px 1.5px at 72% 16%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 42% 40%, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 86% 48%, rgba(255,255,255,.7), transparent), linear-gradient(180deg,#241a52 0%, #4a3a7e 52%, #2e8d7a 100%)", gc: "#bff0e0", gx: "60%", gy: "30%", gs: 150 },
  { bg: "linear-gradient(180deg,#2a1f5c 0%, #6d4aa0 58%, #f3bd95 100%)", gc: "#ffd9a8", gx: "40%", gy: "30%", gs: 170 },
  { bg: "radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,.9), transparent), radial-gradient(1.5px 1.5px at 72% 16%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 42% 40%, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 86% 48%, rgba(255,255,255,.7), transparent), linear-gradient(180deg,#1b1640 0%, #463a7a 54%, #c98bb0 100%)", gc: "#ffe3b0", gx: "72%", gy: "24%", gs: 140 },
] as const;

const MOCK_STORY: StoryData = {
  title: "הַכּוֹכָב שֶׁל עוֹז",
  pages: {
    "1": "בַּלַּיְלָה הַשָּׁקֵט עוֹז סָפַר כּוֹכָבִים,\nוּבְכָל לֵב חָלַם עַל חַיִּים.\nפִּתְאוֹם כּוֹכָב אֶחָד נָפַל מִן הָרָקִיעַ —\n\"שָׁם!\" קָרָא עוֹז, \"אֵלֵךְ וְאַגִּיעַ!\"",
    "2": "עוֹז רָץ לַגִּינָה וּמָצָא בֵּין פְּרָחִים\nכּוֹכָב קָטָן, מְנַצְנֵץ, בֵּין עֲשָׂבִים.\nיָדָיו הֵרִימוּהוּ בְּנַחַת וּבְחֹם —\n\"שָׁלוֹם!\" לָחַשׁ עוֹז, \"אֲנִי כָּאן, שָׁלוֹם!\"",
    "3": "הַכּוֹכָב בָּכָה, כְּנָפָיו שְׁבוּרוֹת,\n\"אֵין לִי כֹּחַ!\" בָּכָה בְּדִמְעוֹת.\nעוֹז חָשַׁב... וְאָז: \"יֵשׁ לִי רַעְיוֹן!\"\nהוּא נָשַׁף עָלָיו — רוּחַ כְּמוֹ חַלּוֹן.",
    "4": "הָאוֹר חָזַר! הַכּוֹכָב הִדְלִיק,\nכְּנָפָיו פָּרְחוּ — כְּמוֹ שִׁיר עַתִּיק.\n\"תּוֹדָה!\" זָרַח הַכּוֹכָב וְעָלָה לַשָּׁמַיִם —\nעוֹז הִבִּיט וְלִבּוֹ שָׁר — לְחַיִּים!",
    "5": "כָּל לַיְלָה מֵאִיר הַכּוֹכָב מֵעַל בֵּיתוֹ,\n\"חָבֵר לָנֶצַח,\" לָחַשׁ עוֹז, \"אֲנִי זוֹכֵר אוֹתוֹ.\"\nהוּא נִרְדַּם בְּחִיּוּךְ, לֵב שָׁר לוֹ שִׁיר —\n\"שָׁלוֹם, כּוֹכָב!\" לָחַשׁ עוֹז, \"תָּמִיד תָּאִיר!\"",
  },
  rhymeScheme: "AABB",
  wordCount: 0,
  illustratedStory: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScene(idx: number) {
  return SCENES[idx % SCENES.length];
}

// Maps any page key to the "representative" key for its 3-page group.
// Pages 0-2 share the page-0 image, pages 3-5 share the page-3 image, etc.
function getImageKey(pageKey: string, sortedPageKeys: string[]): string {
  if (pageKey === "cover") return "cover";
  const idx = sortedPageKeys.indexOf(pageKey);
  if (idx === -1) return pageKey;
  return sortedPageKeys[Math.floor(idx / 3) * 3] ?? sortedPageKeys[0];
}

async function fetchImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (data.success && data.imageData) {
      return `data:${data.mimeType};base64,${data.imageData}`;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const Home: NextPage = () => {
  const router = useRouter();
  const { user, tier, credits, profile, refresh } = useUserContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState<null | "creditsWall" | "buySheet">(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [storyUsedCredit, setStoryUsedCredit] = useState(false);

  const [phase, setPhase] = useState<Phase>("form");
  const [prompt, setPrompt] = useState("");
  const [ageGroup, setAgeGroup] = useState("4-6");
  const [authorName, setAuthorName] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [stage, setStage] = useState(0);
  const [cw, setCw] = useState(480);
  const [story, setStory] = useState<StoryData | null>(null);
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [appError, setAppError] = useState<AppError | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const prevPageRef = useRef(0);
  // Stable refs so event handlers don't stale-close over state
  const phaseRef = useRef(phase);
  const totalRef = useRef(1);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const isDesktop = cw >= 1024;
  const isTablet = cw >= 600 && cw < 1024;
  const sortedPageKeys = story
    ? Object.keys(story.pages).sort((a, b) => Number(a) - Number(b))
    : [];
  const total = story ? 1 + sortedPageKeys.length : 1;
  useEffect(() => { totalRef.current = total; }, [total]);

  // ResizeObserver for responsive breakpoint
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setCw(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stable go() using refs to avoid stale closures in event handlers
  const go = useCallback((d: number) => {
    stopSpeech();
    setCurrentPage((p) => Math.max(0, Math.min(totalRef.current - 1, p + d)));
  }, []);

  // Keyboard + swipe — registered once
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "reading") return;
      if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
    };
    const onTS = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
    };
    const onTE = (e: TouchEvent) => {
      if (phaseRef.current !== "reading" || touchStartRef.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      touchStartRef.current = null;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchend", onTE, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchend", onTE);
    };
  }, [go]);

  // Page flip animation
  useEffect(() => {
    if (pageRef.current && phase === "reading") {
      const back = currentPage < prevPageRef.current;
      try {
        pageRef.current.animate(
          [
            { opacity: 0, transform: `translateX(${back ? -26 : 26}px)` },
            { opacity: 1, transform: "none" },
          ],
          { duration: 380, easing: "cubic-bezier(.22,.61,.36,1)" }
        );
      } catch (_) {}
    }
    prevPageRef.current = currentPage;
  }, [currentPage, phase]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeech();
  }, []);

  // Detect successful payment redirect (?payment=success)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "success") {
      setShowSuccessModal(true);
      refresh();
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopSpeech() {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}
    setSpeaking(false);
  }

  const loadImage = useCallback(async (key: string, imagePrompt: string) => {
    setImages((prev) => ({ ...prev, [key]: "loading" }));
    const url = await fetchImage(imagePrompt);
    setImages((prev) => ({ ...prev, [key]: url ?? "error" }));
  }, []);

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) return;

    // ── Tier gate ────────────────────────────────────────────────────────────
    const guestCount = parseInt(
      (typeof localStorage !== "undefined" ? localStorage.getItem("papa_tales_guest_count") : null) ?? "0"
    );
    if (!user && guestCount >= 1) { router.push("/auth?mode=register"); return; }
    if (user && tier === "free" && (profile?.stories_generated ?? 0) >= 5) {
      setShowUpgradeModal("creditsWall"); return;
    }
    if (user && tier === "paid" && credits <= 0) {
      setShowUpgradeModal("creditsWall"); return;
    }
    const useCredit = !!user && credits > 0;
    // ─────────────────────────────────────────────────────────────────────────

    setAppError(null);
    setPhase("generating");
    setStage(0);
    setDemoMode(false);

    const savedPrompt = prompt.trim();
    let s = 0;
    timerRef.current = setInterval(() => {
      s++;
      if (s < STAGES.length) setStage(s);
    }, 1400);

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: savedPrompt, ageGroup, useCredit }),
      });
      const data: GenerateStoryResponse = await res.json();

      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

      if (!data.success || !data.data) {
        const code = data.error?.code ?? "";
        let scenario: ErrorScenario = "server";
        if (code === "RATE_LIMIT_EXCEEDED") scenario = "rate";
        else if (code === "INVALID_INPUT") scenario = "content";
        setAppError({ scenario, savedPrompt });
        setPhase("form");
        return;
      }

      const result: StoryData = {
        title: data.data.title,
        pages: data.data.pages,
        rhymeScheme: data.data.rhymeScheme,
        wordCount: data.data.wordCount,
        illustratedStory: data.data.illustratedStory,
      };

      const creditStory = data.data.usedCredit ?? false;
      setStoryUsedCredit(creditStory);
      setStory(result);
      setCurrentPage(0);
      setPhase("reading");

      // Guest: increment localStorage counter
      if (!user) {
        localStorage.setItem("papa_tales_guest_count", "1");
      }
      // Refresh credits/profile in background
      refresh();

      // Tier-aware image fan-out: credit = cover + all pages; free/guest = cover only
      const pageKeys = Object.keys(data.data.pages).sort((a, b) => Number(a) - Number(b));
      const imageKeys = creditStory
        ? ["cover", ...pageKeys]
        : ["cover"];
      setImages(Object.fromEntries(imageKeys.map((k) => [k, "loading" as ImageState])));

      (async () => {
        const prompts = result.illustratedStory;
        for (let i = 0; i < imageKeys.length; i += 2) {
          await Promise.all(
            imageKeys.slice(i, i + 2).map((key) => {
              const p = prompts[key];
              return p ? loadImage(key, p) : Promise.resolve();
            })
          );
        }
      })();
    } catch (err) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      let scenario: ErrorScenario = "server";
      if (typeof navigator !== "undefined" && !navigator.onLine) scenario = "offline";
      setAppError({ scenario, savedPrompt });
      setPhase("form");
    }
  };

  const handleRetry = () => {
    setAppError(null);
    handleGenerate();
  };

  const handleEditPrompt = () => {
    setAppError(null);
    setPhase("form");
  };

  const handleDemo = () => {
    stopSpeech();
    setStory(MOCK_STORY);
    setImages({
      cover: "/demo/cover.png",
      "1": "/demo/1.png",
      "2": "/demo/2.png",
      "3": "/demo/3.png",
      "4": "/demo/4.png",
      "5": "/demo/5.png",
    });
    setStoryUsedCredit(true);
    setCurrentPage(0);
    setDemoMode(true);
    setPhase("reading");
  };

  const handleReset = () => {
    stopSpeech();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPhase("form");
    setCurrentPage(0);
    setDemoMode(false);
  };

  const handleSpeak = () => {
    if (!storyUsedCredit) { setShowUpgradeModal("buySheet"); return; }
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) { stopSpeech(); return; }
    if (!story) return;
    const text =
      currentPage === 0
        ? story.title
        : story.pages[sortedPageKeys[currentPage - 1]] ?? "";
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "he-IL";
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  // Derived values
  const isCover = currentPage === 0;
  const pageKey = isCover ? "cover" : sortedPageKeys[currentPage - 1];
  const imageKey = getImageKey(pageKey, sortedPageKeys);
  const sc = getScene(currentPage);
  const imageState = images[pageKey];
  const hasRealImage =
    imageState != null && imageState !== "loading" && imageState !== "error";
  const pageText = story && !isCover ? story.pages[sortedPageKeys[currentPage - 1]] : "";
  const authorDisplay = authorName ? `מאת ${authorName}` : "מאת אבא של עמית";
  const pageLabel = isCover ? "שער" : `${currentPage} / ${total - 1}`;
  const canGen = prompt.trim().length >= 10;
  const charLen = prompt.length;
  const counterText =
    charLen < 10 ? `עוד ${10 - charLen} תווים לפחות` : `${charLen} / 500`;

  // Shared scene block rendered in both compact and desktop
  const SceneLayers = ({ showTag = false }: { showTag?: boolean }) => (
    <>
      <div className={styles.sceneLayer} style={{ background: sc.bg }} />
      <div
        className={styles.glowLayer}
        style={{
          top: sc.gy,
          left: sc.gx,
          width: sc.gs,
          height: sc.gs,
          background: `radial-gradient(circle, ${sc.gc} 0%, transparent 70%)`,
        }}
      />
      {hasRealImage && (
        <img
          src={imageState as string}
          alt="illustration"
          className={styles.realImage}
        />
      )}
      {imageState === "error" && !isCover && (
        <div className={styles.imageErrorOverlay}>
          <span className={styles.imageErrorIcon}>🎨</span>
          <span className={styles.imageErrorText}>האיור לא נטען</span>
          <button
            className={styles.imageRetryBtn}
            onClick={() => story && loadImage(imageKey, story.illustratedStory[imageKey])}
          >
            ↻ טעינה מחדש
          </button>
        </div>
      )}
      {/* Locked inner-image overlay for free/guest stories */}
      {!storyUsedCredit && !isCover && !demoMode && imageState === undefined && (
        <div className={styles.lockedImageOverlay}>
          <div className={styles.lockedImageContent}>
            <div className={styles.lockedImageIcon}>🔒</div>
            <div className={styles.lockedImageTitle}>איור מלא לכל עמוד</div>
            <div className={styles.lockedImageSub}>בסיפורי קרדיט כל עמוד מקבל איור משלו</div>
            <button
              className={styles.lockedImageBtn}
              onClick={() => setShowUpgradeModal("buySheet")}
            >
              שדרגו · 5$
            </button>
          </div>
        </div>
      )}
      {showTag && <span className={styles.demoTag}>איור · דמו</span>}
    </>
  );

  return (
    <>
      <Head>
        <title>אבא סיפור — יוצר סיפורים לילדים</title>
        <meta name="description" content="יצירת סיפורי ילדים מחורזים ומאויירים בעברית" />
        <meta charSet="utf-8" />
      </Head>

      <div ref={rootRef} className={styles.wrapper}>

        {/* ── Error card (replaces form on failure) ── */}
        {phase === "form" && appError && (() => {
          const sc = ERROR_SCENARIOS[appError.scenario];
          return (
            <div className={styles.errorCard}>
              <div className={styles.errorIcon}>{sc.glyph}</div>
              <h2 className={styles.errorTitle}>{sc.title}</h2>
              <p className={styles.errorMessage}>{sc.message}</p>
              {sc.showPrompt && appError.savedPrompt && (
                <div className={styles.savedPromptBox}>
                  <div className={styles.savedPromptLabel}>הבקשה שלכם נשמרה</div>
                  <div className={styles.savedPromptText}>{appError.savedPrompt}</div>
                </div>
              )}
              <button
                className={styles.errorPrimaryBtn}
                onClick={sc.primaryRetry ? handleRetry : handleEditPrompt}
              >
                {sc.primaryLabel}
              </button>
              {sc.secondaryLabel && (
                <button className={styles.errorSecondaryBtn} onClick={handleEditPrompt}>
                  {sc.secondaryLabel}
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Form ── */}
        {phase === "form" && !appError && (
          <div className={styles.formCard}>
            {/* ── User identity + quota header ── */}
            <FormHeader
              user={user}
              tier={tier}
              credits={credits}
              profile={profile}
              onSignOut={async () => { await signOut(); refresh(); }}
              onUpgrade={() => setShowUpgradeModal("creditsWall")}
            />

            <span className={styles.moonEmoji}>🌙</span>
            <h1 className={styles.appTitle}>אבא סיפור</h1>
            <p className={styles.appSubtitle}>סיפור ילדים מחורז ומאויר — תוך רגע</p>

            <div className={styles.field}>
              <label className={styles.label}>על מה הסיפור?</label>
              <textarea
                className={styles.textarea}
                placeholder="לדוגמה: ילדה קטנה שטסה עם כוכב להרפתקה בין העננים…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
              />
              <div className={styles.charCount}>{counterText}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>קבוצת גיל</label>
              <div className={styles.agePills}>
                {AGE_GROUPS.map((g) => {
                  const active = g.value === ageGroup;
                  return (
                    <button
                      key={g.value}
                      className={styles.agePill}
                      onClick={() => setAgeGroup(g.value)}
                      style={
                        active
                          ? {
                              background: ACCENT.main,
                              borderColor: ACCENT.main,
                              color: "#fff",
                              fontWeight: 700,
                            }
                          : undefined
                      }
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.fieldLast}>
              <label className={styles.label}>
                שם הכותב/ת{" "}
                <span className={styles.labelOptional}>· אופציונלי</span>
              </label>
              <input
                className={styles.input}
                type="text"
                placeholder="לדוגמה: אבא של עמית"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!canGen}
              style={{
                background: canGen
                  ? `linear-gradient(135deg, ${ACCENT.main}, ${ACCENT.deep})`
                  : "rgba(100,80,140,.35)",
                boxShadow: canGen ? `0 10px 24px ${ACCENT.main}55` : "none",
                opacity: canGen ? 1 : 0.7,
              }}
            >
              {tier === "paid" && credits > 0 ? "צרו סיפור מלא ✨" : "צרו סיפור בסיסי ✨"}
            </button>

            {!canGen && (
              <p className={styles.lowCharsHint}>כתבו לפחות 10 תווים כדי להתחיל</p>
            )}
            {canGen && tier !== "paid" && (
              <p style={{ textAlign: "center", fontSize: ".76rem", color: "#b6a48d", marginTop: ".6rem", lineHeight: 1.55 }}>
                סיפור בסיסי — כריכה מאוירת בלבד, ללא הקראה.{" "}
                <button
                  onClick={() => setShowUpgradeModal("creditsWall")}
                  style={{ background: "none", border: "none", color: "#b9842a", fontFamily: "'Rubik', sans-serif", fontSize: ".76rem", fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  שדרגו לסיפור מלא ✦
                </button>
              </p>
            )}

            <button className={styles.demoLink} onClick={handleDemo}>
              דלגו ישר לדוגמת הספר ←
            </button>
          </div>
        )}

        {/* ── Generating ── */}
        {phase === "generating" && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinnerWrap}>
              <div className={styles.spinRing} />
              <div className={styles.spinnerMoon}>🌙</div>
            </div>
            <p className={styles.loadingTitle}>{STAGES[stage]}</p>
            <p className={styles.loadingHint}>רגע אחד, מכינים לכם משהו יפה…</p>
          </div>
        )}

        {/* ── Reader ── */}
        {phase === "reading" && story && (
          <div
            className={`${styles.readerWrap} ${isDesktop ? styles.readerWrapDesktop : isTablet ? styles.readerWrapTablet : ""}`}
          >
            {/* Header */}
            <div className={styles.readerHeader}>
              <span className={styles.readerLogo}>אבא סיפור · 🌙</span>
              <button className={styles.newStoryBtn} onClick={handleReset}>
                סיפור חדש
              </button>
            </div>

            {/* Page card */}
            <div
              ref={pageRef}
              className={`${styles.pageCard} ${isDesktop ? styles.pageCardDesktop : ""} ${!isDesktop && !isCover ? styles.pageCardColumn : ""}`}
              style={{ aspectRatio: isDesktop ? "16/10" : isCover ? "3/4" : undefined }}
            >

                {/* ── Compact cover (mobile + tablet) — absolute overlay on portrait image ── */}
                {!isDesktop && isCover && (
                  <div className={styles.pageInner}>
                    <SceneLayers showTag={demoMode} />
                    <div className={styles.coverOverlay}>
                      <span className={styles.coverDecor}>✦</span>
                      <h2 className={styles.coverTitle}>{story.title}</h2>
                      <p className={styles.coverAuthor}>{authorDisplay}</p>
                      <span className={styles.coverDecor}>✦</span>
                      <span className={styles.coverHint}>
                        הקישו ▶ להקראה · דפדפו להמשך
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Compact inner pages (mobile + tablet) — image on top, text below ── */}
                {!isDesktop && !isCover && (
                  <>
                    <div className={styles.pageImageArea}>
                      <SceneLayers showTag={demoMode} />
                      {story.rhymeScheme && (
                        <span
                          className={styles.rhymeBadge}
                          style={{ color: ACCENT.ink, background: ACCENT.soft }}
                        >
                          חריזה · {story.rhymeScheme}
                        </span>
                      )}
                    </div>
                    <div className={styles.captionBelow}>
                      <p className={styles.captionText}>{pageText}</p>
                    </div>
                  </>
                )}

                {/* ── Desktop ── */}
                {isDesktop && (
                  <div className={styles.pageInner}>
                    {isCover && (
                      <>
                        <SceneLayers showTag={demoMode} />
                        <div className={styles.desktopCoverOverlay}>
                          <span className={styles.desktopCoverDecor}>✦</span>
                          <h2 className={styles.desktopCoverTitle}>{story.title}</h2>
                          <p className={styles.coverAuthor}>{authorDisplay}</p>
                          <span className={styles.desktopCoverDecor}>✦</span>
                          <span className={styles.desktopCoverHint}>
                            הקישו ▶ להקראה · דפדפו להמשך
                          </span>
                        </div>
                      </>
                    )}

                    {!isCover && (
                      <div className={styles.desktopSplit}>
                        <div className={styles.desktopText}>
                          <p className={styles.desktopTextContent}>{pageText}</p>
                          {story.rhymeScheme && (
                            <span
                              className={styles.rhymeBadge}
                              style={{ color: ACCENT.ink, background: ACCENT.soft }}
                            >
                              חריזה · {story.rhymeScheme}
                            </span>
                          )}
                          <span className={styles.desktopPageNum}>{pageLabel}</span>
                        </div>

                        <div className={styles.desktopIllustration}>
                          <SceneLayers showTag={demoMode} />
                        </div>

                        <div className={styles.spineGradient} />
                      </div>
                    )}
                  </div>
                )}

            </div>

            {/* Controls */}
            <div className={styles.controls}>
              <button
                className={styles.navBtn}
                onClick={() => go(-1)}
                disabled={currentPage === 0}
              >
                →
              </button>

              <button
                className={styles.playBtn}
                onClick={handleSpeak}
                style={{
                  position: "relative",
                  background: storyUsedCredit
                    ? (speaking ? ACCENT.deep : ACCENT.main)
                    : "rgba(255,255,255,.12)",
                  color: storyUsedCredit ? undefined : "rgba(253,243,223,.55)",
                  boxShadow: storyUsedCredit ? `0 8px 20px ${ACCENT.main}66` : "none",
                }}
              >
                {speaking ? "⏸" : "▶"}
                {!storyUsedCredit && (
                  <span className={styles.audioLockBadge}>🔒</span>
                )}
              </button>

              <button
                className={styles.navBtn}
                onClick={() => go(1)}
                disabled={currentPage === total - 1}
              >
                ←
              </button>
            </div>

            {/* Dot pagination */}
            <div className={styles.dots}>
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={i === currentPage ? styles.dotActive : styles.dot}
                  style={
                    i === currentPage ? { background: ACCENT.main } : undefined
                  }
                  onClick={() => {
                    stopSpeech();
                    setCurrentPage(i);
                  }}
                />
              ))}
            </div>

            <span className={styles.pageLabel}>{pageLabel}</span>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {showUpgradeModal && (
        <UpgradeModal
          view={showUpgradeModal}
          onClose={() => setShowUpgradeModal(null)}
        />
      )}
      {showSuccessModal && (
        <SuccessModal onClose={() => setShowSuccessModal(false)} />
      )}
    </>
  );
};

// ── FormHeader — user identity + quota bar at top of form card ───────────────

interface FormHeaderProps {
  user: import("@supabase/supabase-js").User | null;
  tier: "guest" | "free" | "paid";
  credits: number;
  profile: { stories_generated: number } | null;
  onSignOut: () => void;
  onUpgrade: () => void;
}

function FormHeader({ user, tier, credits, profile, onSignOut, onUpgrade }: FormHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const headerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: ".5rem",
    paddingBottom: ".95rem",
    marginBottom: "1.2rem",
    borderBottom: "1px solid rgba(0,0,0,.06)",
  };

  if (!user) {
    // Guest header
    return (
      <div style={headerStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "#efe6fb", borderRadius: 99, padding: ".32rem .7rem", fontSize: ".76rem", fontWeight: 600, color: "#6a4f8c" }}>
          🌙 מצב אורח
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          <button
            onClick={() => router.push("/auth?mode=signin")}
            style={{ background: "none", border: "none", color: "#7a5fa0", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 600, cursor: "pointer", padding: ".35rem .4rem" }}
          >
            כניסה
          </button>
          <button
            onClick={() => router.push("/auth?mode=register")}
            style={{ background: "#7a4fb0", border: "none", color: "#fff", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 700, cursor: "pointer", padding: ".4rem 1rem", borderRadius: 99 }}
          >
            הרשמה
          </button>
        </span>
      </div>
    );
  }

  // Signed-in header
  const displayName = (user.user_metadata?.display_name as string | undefined)
    ?? user.email?.split("@")[0]
    ?? "משתמש";
  const initial = displayName.trim()[0]?.toUpperCase() ?? "מ";

  const used = profile?.stories_generated ?? 0;
  const remaining = Math.max(0, 5 - used);
  const isCredits = tier === "paid" && credits > 0;

  const quotaStyle: React.CSSProperties = isCredits
    ? { background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", borderRadius: 99, padding: "1px 8px", fontSize: ".68rem", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }
    : { background: "#efe6fb", color: "#6a4f8c", borderRadius: 99, padding: "1px 8px", fontSize: ".68rem", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" };

  return (
    <div style={headerStyle}>
      {/* Left: avatar + name + quota */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: ".55rem" }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7a4fb0,#553089)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: ".95rem", flexShrink: 0 }}>
          {initial}
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 700, color: "#3a2a5c" }}>
            שלום, {displayName}
          </span>
          <span style={quotaStyle}>
            {isCredits ? `✦ ${credits} קרדיטים · סיפור מלא` : `נותרו ${remaining} מתוך 5 · סיפור בסיסי`}
          </span>
        </span>
      </span>

      {/* Right: upgrade CTA (free only) + menu button */}
      <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        {tier === "free" && (
          <button
            onClick={onUpgrade}
            style={{ background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", border: "none", borderRadius: 99, padding: ".34rem .72rem", fontFamily: "'Rubik', sans-serif", fontSize: ".74rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            שדרגו למלא ✦
          </button>
        )}
        <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e7dccd", background: "#fffdf8", color: "#7a5fa0", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
        >
          ⋯
        </button>
        {menuOpen && (
          <div style={{ position: "absolute", top: 40, left: 0, background: "#fff8ef", border: "1.5px solid #e7dccd", borderRadius: 12, boxShadow: "0 8px 24px rgba(10,5,30,.18)", minWidth: 120, zIndex: 100, overflow: "hidden" }}>
            <button
              onClick={() => { setMenuOpen(false); onSignOut(); }}
              style={{ width: "100%", padding: ".65rem 1rem", background: "none", border: "none", color: "#6b5a82", fontFamily: "'Assistant', sans-serif", fontSize: ".9rem", fontWeight: 600, cursor: "pointer", textAlign: "right", direction: "rtl" }}
            >
              יציאה
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default Home;
