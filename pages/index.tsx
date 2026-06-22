import type { NextPage } from "next";
import Head from "next/head";
import { useState, useCallback } from "react";
import styles from "@/styles/book.module.css";
import type { GenerateStoryResponse } from "@/types/api";

interface StoryData {
  title: string;
  pages: Record<string, string>;
  rhymeScheme: string;
  wordCount: number;
}

type AppPhase = "form" | "generating" | "reading";

type ImageState = string | "loading" | "error";

const AGE_GROUPS = [
  { value: "2-4", label: "גיל 2–4" },
  { value: "4-6", label: "גיל 4–6" },
  { value: "6-8", label: "גיל 6–8" },
  { value: "8-10", label: "גיל 8–10" },
];

async function planIllustrations(
  title: string,
  pages: Record<string, string>
): Promise<Record<string, string> | null> {
  try {
    const res = await fetch("/api/plan-illustrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, pages }),
    });
    const data = await res.json();
    return data.success ? data.prompts : null;
  } catch {
    return null;
  }
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

const Home: NextPage = () => {
  const [phase, setPhase] = useState<AppPhase>("form");
  const [prompt, setPrompt] = useState("");
  const [ageGroup, setAgeGroup] = useState("4-6");
  const [authorName, setAuthorName] = useState("");
  const [story, setStory] = useState<StoryData | null>(null);
  const [images, setImages] = useState<Record<string, ImageState>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sortedPageKeys = story
    ? Object.keys(story.pages).sort((a, b) => Number(a) - Number(b))
    : [];
  const totalPages = sortedPageKeys.length + 1; // +1 for cover

  const loadImage = useCallback(
    async (key: string, imagePrompt: string) => {
      setImages((prev) => ({ ...prev, [key]: "loading" }));
      const url = await fetchImage(imagePrompt);
      setImages((prev) => ({ ...prev, [key]: url ?? "error" }));
    },
    []
  );

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) return;
    setError(null);
    setPhase("generating");

    try {
      // Step 1: Generate the story text
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), ageGroup }),
      });
      const data: GenerateStoryResponse = await res.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "שגיאה ביצירת הסיפור");
      }

      const result: StoryData = {
        title: data.data.title,
        pages: data.data.pages,
        rhymeScheme: data.data.rhymeScheme,
        wordCount: data.data.wordCount,
      };

      setStory(result);
      setImages({});
      setCurrentPage(0);
      setPhase("reading");

      // Step 2: Plan ALL illustration prompts in one Gemini call (character consistency)
      (async () => {
        const sortedKeys = Object.keys(data.data!.pages).sort(
          (a, b) => Number(a) - Number(b)
        );
        const allKeys = ["cover", ...sortedKeys];

        // Mark all as loading
        setImages(Object.fromEntries(allKeys.map((k) => [k, "loading"])));

        const prompts = await planIllustrations(result.title, result.pages);

        if (!prompts) {
          // Planning failed — mark all as error
          setImages(Object.fromEntries(allKeys.map((k) => [k, "error"])));
          return;
        }

        // Step 3: Send each prompt to FLUX, 2 at a time
        for (let i = 0; i < allKeys.length; i += 2) {
          await Promise.all(
            allKeys.slice(i, i + 2).map((key) => {
              const p = prompts[key];
              return p ? loadImage(key, p) : Promise.resolve();
            })
          );
        }
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      setPhase("form");
    }
  };

  const handleNewStory = () => {
    setPhase("form");
    setStory(null);
    setImages({});
    setCurrentPage(0);
    setError(null);
  };

  const currentKey = currentPage === 0 ? "cover" : sortedPageKeys[currentPage - 1];
  const currentImage = images[currentKey];

  return (
    <>
      <Head>
        <title>Papa Tales — יוצר סיפורים לילדים</title>
        <meta name="description" content="יצירת סיפורי ילדים מאויירים בעברית" />
        <meta charSet="utf-8" />
      </Head>

      <div className={styles.wrapper}>
        {/* ── Form ── */}
        {phase === "form" && (
          <div className={styles.formCard}>
            <h1 className={styles.appTitle}>Papa Tales 📖</h1>
            <p className={styles.appSubtitle}>יוצר סיפורי ילדים מאויירים בעברית</p>

            {error && <div className={styles.errorBox}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>על מה הסיפור?</label>
              <textarea
                className={styles.textarea}
                placeholder="לדוגמה: סיפור על ילדה קטנה שמצאה חבר חדש בגן..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={500}
              />
              <div className={styles.charCount}>{prompt.length} / 500</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>קבוצת גיל</label>
              <select
                className={styles.select}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              >
                {AGE_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>שם הכותב/ת (אופציונלי)</label>
              <input
                className={styles.input}
                type="text"
                placeholder='לדוגמה: "אבא של עמית"'
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={prompt.trim().length < 10}
            >
              צור סיפור ✨
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {phase === "generating" && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>כותב את הסיפור שלך...</p>
            <p className={styles.loadingHint}>זה לוקח כ-15–25 שניות</p>
          </div>
        )}

        {/* ── Book viewer ── */}
        {phase === "reading" && story && (
          <div className={styles.bookWrap}>
            <div className={styles.book}>
              {currentPage === 0 ? (
                <div className={styles.coverIllustrationPage}>
                  {renderImage(currentImage)}
                </div>
              ) : (
                <div className={styles.illustrationPage}>
                  {renderImage(currentImage)}
                </div>
              )}

              {currentPage === 0 ? (
                <div className={styles.coverTextPage}>
                  <span className={styles.coverDecor}>✦</span>
                  <h2 className={styles.coverTitle}>{story.title}</h2>
                  {authorName && (
                    <p className={styles.coverAuthor}>מאת {authorName}</p>
                  )}
                  <span className={styles.coverDecor}>✦</span>
                  <span className={styles.coverHint}>לחץ הבא לקריאה</span>
                </div>
              ) : (
                <div className={styles.textPage}>
                  <p className={styles.pageText}>
                    {story.pages[sortedPageKeys[currentPage - 1]]}
                  </p>
                  <div className={styles.pageFooter}>
                    <span className={styles.pageNum}>
                      {currentPage} / {totalPages - 1}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.navigation}>
              <button
                className={styles.navBtn}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                ← הקודם
              </button>
              <span className={styles.pageIndicator}>
                {currentPage === 0 ? "שער" : `${currentPage} / ${totalPages - 1}`}
              </span>
              <button
                className={styles.navBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                הבא →
              </button>
            </div>

            <button className={styles.newStoryBtn} onClick={handleNewStory}>
              ✏️ סיפור חדש
            </button>
          </div>
        )}
      </div>
    </>
  );
};

function renderImage(state: ImageState | undefined) {
  if (!state || state === "loading") {
    return <div className={styles.illustrationSkeleton} />;
  }
  if (state === "error") {
    return <div className={styles.illustrationFallback}>🎨</div>;
  }
  return <img src={state} alt="illustration" className={styles.illustrationImage} />;
}

export default Home;
