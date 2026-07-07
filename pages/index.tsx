import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import styles from "@/styles/book.module.css";
import type { GenerateStoryResponse } from "@/types/api";
import type { LibraryStory } from "@/pages/api/stories/library";
import { useUserContext } from "@/lib/user-context";
import { signOut } from "@/lib/auth";
import { authFetch } from "@/lib/auth-fetch";
import UpgradeModal from "@/components/UpgradeModal";
import SuccessModal from "@/components/SuccessModal";
import TierComparisonModal from "@/components/TierComparisonModal";
import Image from "next/image";
import { useLocale } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

// ── Types ────────────────────────────────────────────────────────────────────

interface StoryData {
  title: string;
  pages: Record<string, string>;
  rhymeScheme: string;
  wordCount: number;
  illustratedStory: Record<string, string>;
}

type Phase = "form" | "generating" | "reading" | "limit" | "library";
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

const ACCENT = { main: "#7a4fb0", deep: "#553089", soft: "#efe6fb", ink: "#4a2d72" };

const GUEST_DATE_KEY = "papatales_guest_story_date";
const GUEST_STORY_KEY = "papatales_guest_story";

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function guestUsedToday(): boolean {
  try {
    return typeof localStorage !== "undefined" &&
      localStorage.getItem(GUEST_DATE_KEY) === getTodayStr();
  } catch { return false; }
}
function hoursUntilMidnight(): number {
  return Math.max(1, 24 - new Date().getHours());
}


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

const MOCK_STORY_EN: StoryData = {
  title: "Oz's Star",
  pages: {
    "1": "One quiet night, young Oz looked up high,\nAnd counted the stars in the velvet-dark sky.\nThen — flash! — one came tumbling, all blazing and bright,\n\"I'll find it!\" cried Oz, and he ran through the night!",
    "2": "He searched through the garden, past blossoms and dew,\nAnd found the small star in the grass, shining blue.\nHe cradled it gently with warm, careful hands —\n\"Hello, little star — I am here, understand?\"",
    "3": "The star gave a sob, its wings broken and dim,\n\"I've lost all my glow!\" it wept soft on a whim.\nOz thought for a moment... then called out: \"I know!\"\nHe breathed a warm breath — and the star felt its glow.",
    "4": "The light flooded back — golden, dazzling, and bright!\nThe wings spread like music across the dark night.\n\"Thank you!\" sang the star as it soared through the blue —\nOz cheered from below: \"I'll always love you!\"",
    "5": "Each night, that same star twinkles soft up above,\nA lantern of friendship, a beacon of love.\nOz snuggles to sleep with a smile on his face —\n\"Goodnight, little star — you light up every place!\"",
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

async function fetchImage(prompt: string, useCache = false): Promise<string | null> {
  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, useCache }),
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

// ── Types ─────────────────────────────────────────────────────────────────────


// ── Component ─────────────────────────────────────────────────────────────────

const Home: NextPage = () => {
  const router = useRouter();
  const T = useLocale();
  const locale = router.locale ?? "he";
  // Full-page nav: bypasses the Next.js client-side router so the i18n middleware resolves
  // locale once per request instead of entering the /_next/data/ 307 redirect loop.
  const navTo = (path: string) => {
    window.location.href = `${locale === "en" ? "/en" : ""}${path}`;
  };

  const STAGES = T.stages;

  const ERROR_SCENARIOS: Record<ErrorScenario, {
    glyph: string; title: string; message: string;
    primaryLabel: string; primaryRetry: boolean;
    secondaryLabel: string | null; showPrompt: boolean;
  }> = {
    offline: { ...T.errorOffline, primaryRetry: true,  showPrompt: true  },
    server:  { ...T.errorServer,  primaryRetry: true,  showPrompt: true  },
    timeout: { ...T.errorTimeout, primaryRetry: true,  showPrompt: true  },
    rate:    { ...T.errorRate,    primaryRetry: true,  showPrompt: false },
    content: { ...T.errorContent, primaryRetry: false, showPrompt: true  },
  };

  const { user, tier, credits, profile, role, ready, refresh } = useUserContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState<null | "creditsWall" | "buySheet">(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
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
  const [savedGuestTitle, setSavedGuestTitle] = useState("");
  const [library, setLibrary] = useState<LibraryStory[]>([]);
  const [libLoaded, setLibLoaded] = useState(false);
  const [libQuery, setLibQuery] = useState("");
  const [libSort, setLibSort] = useState<"new" | "old">("new");
  const [libFavOnly, setLibFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const savedToDbRef = useRef<string | null>(null); // null = unsaved, "saving" = in-flight, uuid = done

  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef<number | null>(null);
  // Stable refs so event handlers don't stale-close over state
  const phaseRef = useRef(phase);
  const totalRef = useRef(1);
  const currentPageRef = useRef(0);
  const imagesRef = useRef<Record<string, ImageState>>({});
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { imagesRef.current = images; }, [images]);
  // _document.tsx only runs on the server; keep the HTML dir attribute in sync for client-side locale switches
  useEffect(() => {
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
  }, [locale]);


  // Swap demo story language when locale changes mid-demo
  useEffect(() => {
    if (!demoMode) return;
    stopSpeech();
    setStory(locale === "en" ? MOCK_STORY_EN : MOCK_STORY);
  }, [locale, demoMode]);

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
    const curr = currentPageRef.current;
    const next = Math.max(0, Math.min(totalRef.current - 1, curr + d));
    if (next === curr) return;
    setNavDir(d > 0 ? 1 : -1);
    setCurrentPage(next);
  }, []);

  // Keyboard + swipe — registered once
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "reading") return;
      if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
    };
    const onTS = (e: TouchEvent) => {
      if (!e.touches.length) return;
      touchStartRef.current = e.touches[0].clientX;
    };
    const onTE = (e: TouchEvent) => {
      if (phaseRef.current !== "reading" || touchStartRef.current == null) return;
      if (!e.changedTouches.length) return;
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


  // Cleanup timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopSpeech();
  }, []);

  // Fetch saved story library for signed-in users
  useEffect(() => {
    if (!user) return;
    authFetch("/api/stories/library")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.stories) setLibrary(data.stories as LibraryStory[]);
      })
      .catch(() => {})
      .finally(() => setLibLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-save credit story to DB once all images have settled (loaded or errored)
  useEffect(() => {
    if (!story || !storyUsedCredit || !user) return;
    if (savedToDbRef.current) return;

    const pageKeys = Object.keys(story.pages).sort((a, b) => Number(a) - Number(b));
    const expectedKeys = ["cover", ...pageKeys];
    const allSettled = expectedKeys.every((k) => images[k] !== undefined && images[k] !== "loading");
    if (!allSettled) return;

    savedToDbRef.current = "saving";
    const readyImages: Record<string, string> = {};
    for (const k of expectedKeys) {
      const v = images[k];
      if (v && v !== "loading" && v !== "error") readyImages[k] = v as string;
    }

    authFetch("/api/stories/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, authorName, ageGroup, prompt, images: readyImages }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.id) {
          savedToDbRef.current = data.id;
          setLibrary((prev) => [{
            id: data.id,
            title: story.title,
            author_name: authorName,
            pages: story.pages,
            rhyme_scheme: story.rhymeScheme,
            word_count: story.wordCount,
            illustrated_story: story.illustratedStory,
            imageUrls: readyImages,
            age_group: ageGroup,
            prompt,
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      })
      .catch(() => { savedToDbRef.current = null; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);


  // Check guest 24h daily limit on mount (localStorage not available during SSR)
  useEffect(() => {
    if (typeof window === "undefined" || user) return;
    if (!guestUsedToday()) return;
    try {
      const raw = localStorage.getItem(GUEST_STORY_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StoryData & { authorName?: string; coverImage?: string };
        const { authorName: an, coverImage, ...storyData } = saved;
        setStory(storyData);
        setAuthorName(an ?? "");
        setSavedGuestTitle(storyData.title);
        setImages(coverImage ? { cover: coverImage } : {});
      }
    } catch {}
    setPhase("limit");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cover image to localStorage once it loads (guest only)
  useEffect(() => {
    if (user) return;
    const cover = images["cover"];
    if (!cover || cover === "loading" || cover === "error") return;
    if (!guestUsedToday()) return;
    try {
      const raw = localStorage.getItem(GUEST_STORY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.coverImage === cover) return; // already saved
      saved.coverImage = cover;
      localStorage.setItem(GUEST_STORY_KEY, JSON.stringify(saved));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images["cover"]]);

  // Detect successful PayPal redirect (?payment=success&token=ORDER_ID)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") !== "success") return;

    const orderId = url.searchParams.get("token");
    url.searchParams.delete("payment");
    url.searchParams.delete("token");
    url.searchParams.delete("PayerID");
    window.history.replaceState({}, "", url.toString());

    if (!orderId) return;
    authFetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.credits) {
          setShowSuccessModal(true);
          refresh();
        }
      })
      .catch(() => {});
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

  const loadImage = useCallback(async (key: string, imagePrompt: string, useCache = false) => {
    setImages((prev) => ({ ...prev, [key]: "loading" }));
    const url = await fetchImage(imagePrompt, useCache);
    setImages((prev) => ({ ...prev, [key]: url ?? "error" }));
  }, []);

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) return;

    // ── Tier gate ────────────────────────────────────────────────────────────
    if (!user && guestUsedToday()) { setPhase("limit"); return; }
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
    savedToDbRef.current = null;

    const savedPrompt = prompt.trim();
    let s = 0;
    timerRef.current = setInterval(() => {
      s++;
      if (s < STAGES.length) setStage(s);
    }, 1400);

    try {
      const res = await authFetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: savedPrompt, ageGroup, useCredit, locale }),
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

      if (!user) {
        try {
          localStorage.setItem(GUEST_DATE_KEY, getTodayStr());
          localStorage.setItem(GUEST_STORY_KEY, JSON.stringify({ ...result, authorName }));
        } catch {}
        setSavedGuestTitle(result.title);
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
              return p ? loadImage(key, p, !creditStory) : Promise.resolve();
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
    setStory(locale === "en" ? MOCK_STORY_EN : MOCK_STORY);
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
    setPrompt("");
    setPhase(!user && guestUsedToday() ? "limit" : "form");
    setCurrentPage(0);
    setDemoMode(false);
  };

  const handleDeleteStory = async (id: string) => {
    await authFetch(`/api/stories/delete?id=${id}`, { method: "DELETE" });
    setLibrary((prev) => prev.filter((s) => s.id !== id));
  };

  const openSavedStory = () => {
    if (!story) return;
    stopSpeech();
    setCurrentPage(0);
    setImages({});
    setPhase("reading");
  };

  const loadSavedStory = (saved: LibraryStory) => {
    stopSpeech();
    savedToDbRef.current = saved.id;
    setStory({
      title: saved.title,
      pages: saved.pages,
      rhymeScheme: saved.rhyme_scheme,
      wordCount: saved.word_count,
      illustratedStory: saved.illustrated_story,
    });
    setAuthorName(saved.author_name ?? "");
    setImages(saved.imageUrls as Record<string, ImageState>);
    setStoryUsedCredit(true);
    setDemoMode(false);
    setCurrentPage(0);
    setPhase("reading");
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
    u.lang = locale === "en" ? "en-US" : "he-IL";
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
  const authorDisplay = authorName ? T.by(authorName) : T.by(T.defaultAuthor);
  const pageLabel = isCover ? T.cover : T.pageOf(currentPage, total - 1);
  const canGen = prompt.trim().length >= 10;
  const charLen = prompt.length;
  const counterText = charLen < 10 ? T.counterMore(10 - charLen) : T.counterCount(charLen);

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
        <Image
          src={imageState as string}
          alt="illustration"
          fill
          style={{ objectFit: "cover" }}
          unoptimized={/^(data:|\/demo\/)/.test(imageState as string)}
        />
      )}
      {imageState === "error" && !isCover && (
        <div className={styles.imageErrorOverlay}>
          <span className={styles.imageErrorIcon}>🎨</span>
          <span className={styles.imageErrorText}>{T.imageNotLoaded}</span>
          <button
            className={styles.imageRetryBtn}
            onClick={() => story && loadImage(imageKey, story.illustratedStory[imageKey])}
          >
            {T.imageRetry}
          </button>
        </div>
      )}
      {/* Locked inner-image overlay for free/guest stories */}
      {!storyUsedCredit && !isCover && !demoMode && imageState === undefined && (
        <div className={styles.lockedImageOverlay}>
          <div className={styles.lockedImageContent}>
            <div className={styles.lockedImageIcon}>🔒</div>
            <div className={styles.lockedImageTitle}>{T.lockedImageTitle}</div>
            <div className={styles.lockedImageSub}>{T.lockedImageSub}</div>
            <button
              className={styles.lockedImageBtn}
              onClick={() => setShowUpgradeModal("buySheet")}
            >
              {T.lockedImageBtn}
            </button>
          </div>
        </div>
      )}
      {showTag && <span className={styles.demoTag}>{T.demoBadge}</span>}
    </>
  );

  return (
    <>
      <Head>
        <title>{T.appTitle} — {T.subtitle}</title>
        <meta name="description" content={locale === "he" ? "צרו סיפורי ילדים מחורזים ומאויירים בעברית תוך שניות. מתאים לגילאי 2–10, עם איורים צבעוניים והקראה קולית. נסו בחינם!" : "Create illustrated, rhyming kids' stories in seconds. Ages 2–10, with color illustrations and voice narration. Try free!"} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}${locale === "en" ? "/en" : ""}/`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={T.appTitle} />
        <meta property="og:title" content={`${T.appTitle} — ${T.subtitle}`} />
        <meta property="og:description" content={locale === "he" ? "צרו סיפורי ילדים מחורזים ומאויירים בעברית תוך שניות. מתאים לגילאי 2–10, עם איורים צבעוניים והקראה קולית." : "Create illustrated, rhyming kids' stories in seconds. Ages 2–10, with color illustrations and voice narration."} />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}${locale === "en" ? "/en" : ""}/`} />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${T.appTitle} — ${T.subtitle}`} />
        <meta property="og:locale" content={locale === "he" ? "he_IL" : "en_US"} />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="אבא סיפור — יוצר סיפורים לילדים" />
        <meta name="twitter:description" content="צרו סיפורי ילדים מחורזים ומאויירים בעברית תוך שניות." />
        <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}/og-image.png`} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}/#website`,
                  "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}/`,
                  "name": "אבא סיפור",
                  "description": "יצירת סיפורי ילדים מחורזים ומאויירים בעברית",
                  "inLanguage": "he",
                },
                {
                  "@type": "SoftwareApplication",
                  "name": "אבא סיפור",
                  "applicationCategory": "EducationalApplication",
                  "operatingSystem": "Web",
                  "inLanguage": "he",
                  "description": "צרו סיפורי ילדים מחורזים ומאויירים בעברית תוך שניות. מתאים לגילאי 2–10.",
                  "url": `${process.env.NEXT_PUBLIC_SITE_URL || "https://papa-tales.vercel.app"}/`,
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD",
                    "description": "5 סיפורים חינם לאחר הרשמה",
                  },
                },
              ],
            }),
          }}
        />
      </Head>

      <div ref={rootRef} className={styles.wrapper} dir={locale === "en" ? "ltr" : "rtl"}>

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
                  <div className={styles.savedPromptLabel}>{T.savedPromptLabel}</div>
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

        {/* ── Daily limit (guest, 1/day) ── */}
        {phase === "limit" && (
          <div className={styles.formCard}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", paddingBottom: ".95rem", marginBottom: "1.35rem", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "#efe6fb", borderRadius: 99, padding: ".32rem .7rem", fontSize: ".76rem", fontWeight: 600, color: "#6a4f8c" }}>
                {T.guestMode}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                <LangSwitcher variant="light" />
                <button onClick={() => navTo("/auth?mode=signin")} style={{ background: "none", border: "none", color: "#7a5fa0", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 600, cursor: "pointer", padding: ".35rem .4rem" }}>{T.signIn}</button>
                <button onClick={() => navTo("/auth?mode=register")} style={{ background: "#7a4fb0", border: "none", color: "#fff", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 700, cursor: "pointer", padding: ".4rem 1rem", borderRadius: 99 }}>{T.register}</button>
              </span>
            </div>

            {/* Icon + heading */}
            <div style={{ textAlign: "center", marginBottom: "1.35rem" }}>
              <div style={{ position: "relative", width: 68, height: 68, margin: "0 auto .9rem" }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#efe6fb", color: "#4a2d72", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.9rem" }}>🌙</div>
                <span style={{ position: "absolute", bottom: -2, left: -2, width: 26, height: 26, borderRadius: "50%", background: "#2ecc71", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem", fontWeight: 700, border: "3px solid #fff8ef" }}>✓</span>
              </div>
              <h1 style={{ fontFamily: "'Rubik', sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#3a2a5c", margin: "0 0 .45rem" }}>{T.limitTitle}</h1>
              <p style={{ fontSize: ".95rem", lineHeight: 1.6, color: "#6b5a82", margin: "0 auto", maxWidth: 330 }}>
                {T.limitBody}
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", background: "#fdf3df", color: "#9a6a16", fontWeight: 700, fontSize: ".78rem", padding: ".35rem .85rem", borderRadius: 99, marginTop: ".9rem" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e0a83f", display: "inline-block" }} />
                {T.resetIn(hoursUntilMidnight())}
              </div>
            </div>

            {/* Story card */}
            {story && (
              <button onClick={openSavedStory} style={{ display: "flex", alignItems: "center", gap: ".85rem", width: "100%", textAlign: "start", background: "#fffdf8", border: "1.5px solid #e7dccd", borderRadius: 18, padding: ".7rem", cursor: "pointer", marginBottom: ".85rem" }}>
                <span style={{ position: "relative", width: 58, height: 58, borderRadius: 13, overflow: "hidden", flexShrink: 0 }}>
                  {images["cover"] && images["cover"] !== "loading" && images["cover"] !== "error"
                    ? <Image src={images["cover"] as string} alt="" fill style={{ objectFit: "cover" }} unoptimized={/^(data:|\/demo\/)/.test(images["cover"] as string)} />
                    : <div style={{ position: "absolute", inset: 0, background: SCENES[0].bg }} />
                  }
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: ".12rem", minWidth: 0, textAlign: "start" }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#9a7fb0" }}>{T.todayStory}</span>
                  <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: "1.02rem", fontWeight: 700, color: "#3a2a5c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {savedGuestTitle || story.title}
                  </span>
                  <span style={{ fontSize: ".78rem", color: "#b6a48d" }}>{T.pagesMeta}</span>
                </span>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", background: "#efe6fb", color: "#7a4fb0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem" }}>{T.prevGlyph}</span>
              </button>
            )}

            {/* Continue to story */}
            <button
              onClick={openSavedStory}
              disabled={!story}
              style={{ width: "100%", padding: ".95rem", border: "none", borderRadius: 16, color: "#fff", fontFamily: "'Rubik', sans-serif", fontSize: "1.05rem", fontWeight: 700, cursor: story ? "pointer" : "not-allowed", opacity: story ? 1 : 0.5, background: `linear-gradient(135deg, ${ACCENT.main}, ${ACCENT.deep})`, boxShadow: `0 10px 24px ${ACCENT.main}55`, marginBottom: "1.35rem" }}
            >
              {T.continueStory}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: ".8rem", marginBottom: "1.35rem" }}>
              <span style={{ flex: 1, height: 1, background: "#ece2d4" }} />
              <span style={{ fontSize: ".8rem", color: "#b6a48d", fontWeight: 600 }}>{T.wantMore}</span>
              <span style={{ flex: 1, height: 1, background: "#ece2d4" }} />
            </div>

            {/* Credits upsell */}
            <div style={{ border: "1.5px solid #f0dfb0", background: "linear-gradient(180deg,#fffaf0,#fdf3df)", borderRadius: 18, padding: "1.15rem 1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".65rem", marginBottom: ".75rem" }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>✦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, color: "#3a2a5c", fontSize: "1.02rem" }}>{T.buyNoWait}</div>
                  <div style={{ fontSize: ".82rem", color: "#8a6a3a", fontWeight: 600 }}>{T.buyNoWaitSub}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", marginBottom: "1rem" }}>
                {[T.perkImg, T.perkAudio, T.perkNoLimit].map((perk) => (
                  <span key={perk} style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".86rem", color: "#6b5a82" }}>
                    <span style={{ color: "#dca83f", fontWeight: 700 }}>✦</span> {perk}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setShowUpgradeModal("creditsWall")}
                style={{ width: "100%", padding: ".9rem", border: "none", borderRadius: 14, background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: "1.04rem", cursor: "pointer", boxShadow: "0 10px 22px rgba(220,168,63,.4)" }}
              >
                {T.buyCredits}
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: ".82rem", color: "#9a7fb0", margin: "1.05rem 0 0", lineHeight: 1.55 }}>
              {T.dontPay}{" "}
              <button
                onClick={() => navTo("/auth?mode=register")}
                style={{ background: "none", border: "none", color: "#5b37b7", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                {T.registerFree}
              </button>
            </p>
            <div style={{ textAlign: "center", marginTop: ".7rem" }}>
              <button
                onClick={() => setShowTierModal(true)}
                style={{ background: "none", border: "none", color: "#b6a48d", fontFamily: "'Rubik', sans-serif", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#e0d3c2" }}
              >
                {T.compareAll}
              </button>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {phase === "form" && !appError && (
          <div className={styles.formCard}>
            {/* ── User identity + quota header ── */}
            <FormHeader
              user={user}
              tier={tier}
              credits={credits}
              profile={profile}
              role={role}
              ready={ready}
              onSignOut={async () => { await signOut(); refresh(); }}
              onUpgrade={() => setShowUpgradeModal("creditsWall")}
              onOpenBuy={() => setShowUpgradeModal("buySheet")}
              onOpenLibrary={() => setPhase("library")}
            />

            <span className={styles.moonEmoji}>🌙</span>
            <h1 className={styles.appTitle}>{T.appTitle}</h1>
            <p className={styles.appSubtitle}>{T.subtitle}</p>

            <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
              <button
                onClick={() => setShowTierModal(true)}
                style={{ background: "none", border: "none", color: "#7a5fa0", fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#d9c9ec" }}
              >
                {T.compareLink} ›
              </button>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{T.qWhat}</label>
              <textarea
                className={styles.textarea}
                placeholder={T.promptPh}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
              />
              <div className={styles.charCount}>{counterText}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{T.ageGroup}</label>
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
                {T.authorLabel}{" "}
                <span className={styles.labelOptional}>{T.optional}</span>
              </label>
              <input
                className={styles.input}
                type="text"
                placeholder={T.authorPh}
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
              {tier === "paid" && credits > 0 ? T.genFull : T.genBasic}
            </button>

            {!canGen && (
              <p className={styles.lowCharsHint}>{T.lowChars}</p>
            )}
            {canGen && tier !== "paid" && (
              <p style={{ textAlign: "center", fontSize: ".76rem", color: "#b6a48d", marginTop: ".6rem", lineHeight: 1.55 }}>
                {T.tierHint}{" "}
                <button
                  onClick={() => setShowUpgradeModal("creditsWall")}
                  style={{ background: "none", border: "none", color: "#b9842a", fontFamily: "'Rubik', sans-serif", fontSize: ".76rem", fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  {T.upgradeInline}
                </button>
              </p>
            )}

            <button className={styles.demoLink} onClick={handleDemo}>
              {T.skip}
            </button>
          </div>
        )}

        {/* ── Library ── */}
        {phase === "library" && (
          <LibraryView
            library={library}
            libQuery={libQuery}
            libSort={libSort}
            libFavOnly={libFavOnly}
            favorites={favorites}
            onQuery={setLibQuery}
            onToggleSort={() => setLibSort((s) => s === "new" ? "old" : "new")}
            onToggleFav={() => setLibFavOnly((f) => !f)}
            onToggleFavId={(id: string) => setFavorites((prev) => ({ ...prev, [id]: !prev[id] }))}
            onOpen={(s: LibraryStory) => { loadSavedStory(s); }}
            onClose={() => setPhase("form")}
            onDelete={user ? handleDeleteStory : undefined}
          />
        )}

        {/* ── Generating ── */}
        {phase === "generating" && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinnerWrap}>
              <div className={styles.spinRing} />
              <div className={styles.spinnerMoon}>🌙</div>
            </div>
            <p className={styles.loadingTitle}>{STAGES[stage]}</p>
            <p className={styles.loadingHint}>{T.genHint}</p>
          </div>
        )}

        {/* ── Reader ── */}
        {phase === "reading" && story && (
          <div
            className={`${styles.readerWrap} ${isDesktop ? styles.readerWrapDesktop : isTablet ? styles.readerWrapTablet : ""}`}
          >
            {/* Header */}
            <div className={styles.readerHeader}>
              <span className={styles.readerLogo}>{T.readerBrand}</span>
              <span style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <LangSwitcher variant="dark" />
                {user && library.length > 0 && (
                  <button className={styles.newStoryBtn} onClick={() => { stopSpeech(); setPhase("library"); }}>
                    📚 {T.backToLib}
                  </button>
                )}
                <button className={styles.newStoryBtn} onClick={handleReset}>
                  {T.readerNew}
                </button>
              </span>
            </div>

            {/* Page card */}
            <div
              key={currentPage}
              className={`${styles.pageCard} ${isDesktop ? styles.pageCardDesktop : ""} ${!isDesktop && !isCover ? styles.pageCardColumn : ""} ${navDir > 0 ? styles.pageEnterRight : styles.pageEnterLeft}`}
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
                        {T.coverHint}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Compact inner pages (mobile + tablet) — image on top, text below ── */}
                {!isDesktop && !isCover && (
                  <>
                    <div className={styles.pageImageArea}>
                      <SceneLayers showTag={demoMode} />
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
                              {T.rhymePrefix}{story.rhymeScheme}
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
                {T.prevGlyph}
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
                {T.nextGlyph}
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
      {showTierModal && (
        <TierComparisonModal
          onClose={() => setShowTierModal(false)}
        />
      )}
    </>
  );
};

// ── LibraryView ──────────────────────────────────────────────────────────────

interface LibraryViewProps {
  library: LibraryStory[];
  libQuery: string;
  libSort: "new" | "old";
  libFavOnly: boolean;
  favorites: Record<string, boolean>;
  onQuery: (q: string) => void;
  onToggleSort: () => void;
  onToggleFav: () => void;
  onToggleFavId: (id: string) => void;
  onOpen: (s: LibraryStory) => void;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
}

export function LibraryView({ library, libQuery, libSort, libFavOnly, favorites, onQuery, onToggleSort, onToggleFav, onToggleFavId, onOpen, onClose, onDelete }: LibraryViewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const T = useLocale();
  const q = libQuery.trim();
  let list = library.map((s) => ({ ...s, fav: !!favorites[s.id] }));
  if (q) list = list.filter((s) => s.title.includes(q));
  if (libFavOnly) list = list.filter((s) => s.fav);
  list.sort((a, b) => libSort === "new"
    ? (a.created_at < b.created_at ? 1 : -1)
    : (a.created_at > b.created_at ? 1 : -1));

  const chipBase: React.CSSProperties = { padding: ".42rem .9rem", borderRadius: 99, fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: "1.5px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.07)", color: "rgba(245,235,220,.82)" };
  const emptyFav = libFavOnly && list.length === 0 && !q;

  return (
    <div style={{ width: "min(540px, 94vw)", display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: ".6rem" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: "1.55rem", fontWeight: 800, color: "#fdf3df" }}>{T.libTitle}</span>
          <span style={{ fontSize: ".85rem", color: "rgba(245,235,220,.6)", fontWeight: 500, marginTop: ".15rem" }}>
            {T.libCount(library.length)}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.2)", color: "rgba(245,235,220,.88)", padding: ".5rem 1rem", borderRadius: 99, cursor: "pointer", fontFamily: "'Rubik', sans-serif", fontSize: ".85rem", fontWeight: 700, whiteSpace: "nowrap" }}
        >
          {T.newStory}
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", right: ".95rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", opacity: .55, pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder={T.searchPh}
          value={libQuery}
          onChange={(e) => onQuery(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: ".72rem 2.5rem .72rem 1rem", border: "1.5px solid rgba(255,255,255,.16)", borderRadius: 28, fontSize: ".95rem", fontFamily: "'Assistant', sans-serif", background: "rgba(255,255,255,.07)", color: "#fdf3df", direction: "inherit", outline: "none" }}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
        <button
          onClick={onToggleFav}
          style={libFavOnly ? { ...chipBase, background: "#fbe3ea", color: "#c23a5a", border: "1.5px solid #f3c9d4" } : chipBase}
        >
          {T.favChip}
        </button>
        <button onClick={onToggleSort} style={chipBase}>
          {libSort === "new" ? T.sortNew : T.sortOld}
        </button>
      </div>

      {/* Story rows */}
      {list.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
          {list.map((s) => {
            const cover = s.imageUrls?.cover;
            const pageCount = Object.keys(s.pages).length;
            const scene = SCENES[0];
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: ".85rem", background: "#fff8ef", borderRadius: 18, padding: ".8rem", boxShadow: "0 12px 32px rgba(10,5,30,.34)" }}>
                <button
                  onClick={() => onOpen(s)}
                  style={{ position: "relative", width: 64, height: 64, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", background: "#160f33" }}
                >
                  {cover
                    ? <Image src={cover} alt="" fill style={{ objectFit: "cover" }} unoptimized={/^(data:|\/demo\/)/.test(cover)} />
                    : <div style={{ position: "absolute", inset: 0, background: scene.bg }} />
                  }
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.15rem", background: "rgba(10,5,30,.22)" }}>▶</span>
                </button>
                <button
                  onClick={() => onOpen(s)}
                  style={{ flex: 1, textAlign: "start", background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0 }}
                >
                  <span style={{ display: "block", fontFamily: "'Rubik', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#3a2a5c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
                  <span style={{ display: "block", fontSize: ".8rem", color: "#9a7fb0", fontWeight: 600, marginTop: ".18rem" }}>{T.storyMeta(pageCount, s.age_group)}</span>
                  {s.author_name && <span style={{ display: "block", fontSize: ".76rem", color: "#b6a48d", marginTop: ".1rem" }}>{T.by(s.author_name)}</span>}
                </button>
                <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", flexShrink: 0 }}>
                  <button
                    onClick={() => onToggleFavId(s.id)}
                    title="מועדף"
                    style={{ width: 38, height: 38, borderRadius: "50%", border: `1.5px solid ${s.fav ? "#f3c9d4" : "#e7dccd"}`, background: s.fav ? "#fdecef" : "#fffdf8", color: s.fav ? "#e0557a" : "#cbb8a6", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all .15s" }}
                  >
                    ♥
                  </button>
                  {onDelete && (
                    <button
                      disabled={deletingId === s.id}
                      onClick={async () => {
                        if (!window.confirm(T.deleteConfirm)) return;
                        setDeletingId(s.id);
                        await onDelete(s.id);
                        setDeletingId(null);
                      }}
                      title={T.deleteStory}
                      style={{ width: 38, height: 38, borderRadius: "50%", border: "1.5px solid #e7dccd", background: deletingId === s.id ? "#f5ede8" : "#fffdf8", color: "#c0896e", fontSize: ".95rem", cursor: deletingId === s.id ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, transition: "all .15s", opacity: deletingId === s.id ? .5 : 1 }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,.05)", border: "1.5px dashed rgba(255,255,255,.18)", borderRadius: 18, padding: "2.3rem 1.4rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".6rem" }}>{emptyFav ? "♡" : "🔭"}</div>
          <p style={{ fontFamily: "'Rubik', sans-serif", fontSize: "1rem", fontWeight: 700, color: "#fdf3df", margin: "0 0 .35rem" }}>
            {emptyFav ? T.emptyFavTitle : T.emptyTitle}
          </p>
          <p style={{ fontSize: ".85rem", color: "rgba(245,235,220,.6)", margin: 0 }}>
            {emptyFav ? T.emptyFavHint : (q ? T.emptyHint : T.emptyLibHint)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── FormHeader — user identity + quota bar at top of form card ───────────────

interface FormHeaderProps {
  user: import("@supabase/supabase-js").User | null;
  tier: "guest" | "free" | "paid";
  credits: number;
  profile: { stories_generated: number } | null;
  role: string;
  ready: boolean;
  onSignOut: () => void;
  onUpgrade: () => void;
  onOpenBuy: () => void;
  onOpenLibrary: () => void;
}

function FormHeader({ user, tier, credits, profile, role, ready, onSignOut, onUpgrade, onOpenBuy, onOpenLibrary }: FormHeaderProps) {
  const router = useRouter();
  const T = useLocale();
  const locale = router.locale ?? "he";
  const navTo = (path: string) => { window.location.href = `${locale === "en" ? "/en" : ""}${path}`; };
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
          {T.guestMode}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
          <LangSwitcher variant="light" />
          <button
            onClick={() => navTo("/auth?mode=signin")}
            style={{ background: "none", border: "none", color: "#7a5fa0", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 600, cursor: "pointer", padding: ".35rem .4rem" }}
          >
            {T.signIn}
          </button>
          <button
            onClick={() => navTo("/auth?mode=register")}
            style={{ background: "#7a4fb0", border: "none", color: "#fff", fontFamily: "'Rubik', sans-serif", fontSize: ".86rem", fontWeight: 700, cursor: "pointer", padding: ".4rem 1rem", borderRadius: 99 }}
          >
            {T.register}
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
    ? { background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", borderRadius: 99, padding: "1px 8px", fontSize: ".68rem", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }
    : { background: "#efe6fb", color: "#6a4f8c", borderRadius: 99, padding: "1px 8px", fontSize: ".68rem", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" };

  return (
    <div style={headerStyle}>
      {/* Left: avatar + name + quota */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: ".55rem", minWidth: 0 }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#7a4fb0,#553089)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: ".95rem", flexShrink: 0 }}>
          {initial}
        </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0, overflow: "hidden" }}>
          <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: ".82rem", fontWeight: 700, color: "#3a2a5c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {T.hi(displayName)}
          </span>
          {ready
            ? <span style={quotaStyle}>{isCredits ? T.creditsQuota(credits) : T.basicQuota(remaining)}</span>
            : <span style={{ display: "inline-block", width: 120, height: 14, borderRadius: 99, background: "linear-gradient(90deg,#e8e0f2 25%,#f3eefb 50%,#e8e0f2 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite" }}/>
          }
        </span>
      </span>

      {/* Right: tier-aware actions + menu button */}
      <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        <LangSwitcher variant="light" />
        {tier === "free" && (
          <button
            onClick={onUpgrade}
            style={{ background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", border: "none", borderRadius: 99, padding: ".34rem .72rem", fontFamily: "'Rubik', sans-serif", fontSize: ".74rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {T.upgradeFull}
          </button>
        )}
        {isCredits && (
          <>
            <button
              onClick={onOpenBuy}
              title={T.topUp}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0, boxShadow: "0 3px 8px rgba(217,168,63,.4)" }}
            >
              ✦
            </button>
            <button
              onClick={onOpenLibrary}
              title="הספרים שלי"
              style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e7dccd", background: "#fffdf8", color: "#7a5fa0", fontSize: "1.05rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, flexShrink: 0 }}
            >
              📚
            </button>
          </>
        )}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e7dccd", background: "#fffdf8", color: "#7a5fa0", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              {/* Backdrop — closes menu on outside tap, mirrors LangSwitcher pattern */}
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
              {/* insetInlineEnd: 0 anchors the trailing edge of the dropdown to the trailing edge of the button,
                  keeping it on-screen in both LTR (English) and RTL (Hebrew) layouts */}
              <div style={{ position: "absolute", top: 40, insetInlineEnd: 0, background: "#fff8ef", border: "1.5px solid #e7dccd", borderRadius: 12, boxShadow: "0 8px 24px rgba(10,5,30,.18)", minWidth: 148, zIndex: 99 }}>
                {role === "admin" && (
                  <button
                    onClick={() => { setMenuOpen(false); navTo("/admin"); }}
                    style={{ width: "100%", padding: ".65rem 1rem", background: "none", border: "none", borderBottom: "1px solid #e7dccd", color: "#553089", fontFamily: "'Assistant', sans-serif", fontSize: ".9rem", fontWeight: 700, cursor: "pointer", textAlign: "start", direction: "inherit" }}
                  >
                    ⚙ Admin console
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onSignOut(); }}
                  style={{ width: "100%", padding: ".65rem 1rem", background: "none", border: "none", color: "#6b5a82", fontFamily: "'Assistant', sans-serif", fontSize: ".9rem", fontWeight: 600, cursor: "pointer", textAlign: "start", direction: "inherit" }}
                >
                  {T.signOut}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
