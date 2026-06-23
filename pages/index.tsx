import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import styles from "@/styles/book.module.css";
import type { GenerateStoryResponse } from "@/types/api";

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
  title: "הרפתקה בין הכוכבים",
  pages: {
    "1": "בְּלַיְלָה שָׁקֵט, כְּשֶׁהַיָּרֵחַ עָלָה,\nנוֹעָה הַקְּטַנָּה אֶל הַחַלּוֹן נִגְּלָה.\nכּוֹכָב זוֹהֵר קָרַץ לָהּ מִלְמַעְלָה,\n\"בּוֹאִי,\" הוּא לָחַשׁ, \"לְהַרְפַּתְקָה נִפְלָאָה!\"",
    "2": "עַל עָנָן רַךְ הֵם טָסוּ אֶל עָל,\nמֵעַל הַגַּגּוֹת, מֵעַל הַכֹּל.\nהָרוּחַ לִטְּפָה אֶת שְׂעָרָהּ בַּעֲדִינוּת,\nוְהָעוֹלָם נִרְאָה מָלֵא אֶפְשָׁרֻיּוֹת.",
    "3": "בְּשָׂדֶה שֶׁל כּוֹכָבִים הֵם עָצְרוּ לָנוּחַ,\nוְשָׁם פָּגְשׁוּ דֻּבּוֹן קָטָן וְשָׂמֵחַ.\n\"שָׁלוֹם,\" הוּא אָמַר, \"אֲנִי קְצָת לְבַד,\nאוּלַי תִּהְיוּ לִי חֲבֵרִים בְּיַחַד?\"",
    "4": "נוֹעָה חִיְּכָה וְנָתְנָה לוֹ יָד,\nוּשְׁלָשְׁתָּם רָקְדוּ עַד אוֹר בָּרָד.\nצְחוֹק וְשִׁירָה מִלְּאוּ אֶת הַשָּׁמַיִם,\nוְהַיָּרֵחַ הֵאִיר בִּשְׁתֵּי עֵינַיִם.",
    "5": "חָזְרָה הַבַּיְתָה, אֶל הַמִּטָּה הַחַמָּה,\nעִם חִיּוּךְ מָתוֹק וְלֵב מָלֵא נְשָׁמָה.\n\"לַיְלָה טוֹב, כּוֹכָב,\" הִיא לָחֲשָׁה בְּשֶׁקֶט,\n\"מָחָר שׁוּב נָטוּס, אֶל עוֹלָם נִדְלָק.\"",
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
        body: JSON.stringify({ prompt: savedPrompt, ageGroup }),
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

      setStory(result);
      setCurrentPage(0);
      setPhase("reading");

      // Generate 1 image per 3 story pages to reduce cost/latency
      const pageKeys = Object.keys(data.data.pages).sort((a, b) => Number(a) - Number(b));
      const imageKeys = [
        "cover",
        ...pageKeys.filter((_, i) => i % 3 === 0),
      ];
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
    setImages({});
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
              צרו את הסיפור ✨
            </button>

            {!canGen && (
              <p className={styles.lowCharsHint}>כתבו לפחות 10 תווים כדי להתחיל</p>
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
            className={`${styles.readerWrap} ${isDesktop ? styles.readerWrapDesktop : ""}`}
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
              className={`${styles.pageCard} ${isDesktop ? styles.pageCardDesktop : ""}`}
              style={{ aspectRatio: isDesktop ? "16/10" : "3/4" }}
            >
              <div ref={pageRef} className={styles.pageInner}>

                {/* ── Compact (mobile + tablet) ── */}
                {!isDesktop && (
                  <>
                    <SceneLayers showTag={demoMode} />

                    {isCover && (
                      <div className={styles.coverOverlay}>
                        <span className={styles.coverDecor}>✦</span>
                        <h2 className={styles.coverTitle}>{story.title}</h2>
                        <p className={styles.coverAuthor}>{authorDisplay}</p>
                        <span className={styles.coverDecor}>✦</span>
                        <span className={styles.coverHint}>
                          הקישו ▶ להקראה · דפדפו להמשך
                        </span>
                      </div>
                    )}

                    {!isCover && (
                      <div className={styles.captionDrawer}>
                        <p className={styles.captionText}>{pageText}</p>
                      </div>
                    )}

                    {!isCover && story.rhymeScheme && (
                      <span
                        className={styles.rhymeBadge}
                        style={{ color: ACCENT.ink, background: ACCENT.soft }}
                      >
                        חריזה · {story.rhymeScheme}
                      </span>
                    )}
                  </>
                )}

                {/* ── Desktop ── */}
                {isDesktop && (
                  <>
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
                  </>
                )}

              </div>
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
                  background: speaking ? ACCENT.deep : ACCENT.main,
                  boxShadow: `0 8px 20px ${ACCENT.main}66`,
                }}
              >
                {speaking ? "⏸" : "▶"}
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
    </>
  );
};

export default Home;
