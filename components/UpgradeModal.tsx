import { useState, useEffect } from "react";
import { authFetch } from "@/lib/auth-fetch";

// ── Data ──────────────────────────────────────────────────────────────────────

const PACKAGES = [
  { id: "p3",  stories: 3,  price: 3, perStory: "1.00$ לסיפור", badge: null },
  { id: "p6",  stories: 6,  price: 5, perStory: "0.83$ לסיפור", badge: "מומלץ" },
  { id: "p12", stories: 12, price: 8, perStory: "0.67$ לסיפור", badge: "הכי משתלם" },
] as const;

type PkgId = "p3" | "p6" | "p12";

const PERKS = [
  "איור צבעוני בכל עמוד (לא רק כריכה)",
  "הקראה קולית של הסיפור",
  "סיפורים מלאים לפי הכמות שבחרתם",
];

const GOLD_BTN: React.CSSProperties = {
  width: "100%", padding: ".95rem", border: "none", borderRadius: 16,
  color: "#5a3d0a", fontFamily: "'Rubik', sans-serif",
  fontSize: "1.06rem", fontWeight: 800, cursor: "pointer",
  background: "linear-gradient(135deg, #f3d27a, #dca83f)",
  boxShadow: "0 10px 24px rgba(217,168,63,.45)",
  marginTop: "1.3rem",
};

// ── Package cards shared UI ────────────────────────────────────────────────────

function PkgCards({
  selectedPkg,
  onSelect,
}: {
  selectedPkg: PkgId;
  onSelect: (id: PkgId) => void;
}) {
  return (
    <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem", alignItems: "stretch" }}>
      {PACKAGES.map((p) => {
        const on = p.id === selectedPkg;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              flex: 1, position: "relative", textAlign: "center",
              padding: "1rem .4rem .8rem", borderRadius: 14, cursor: "pointer",
              transition: "all .15s",
              border: on ? "2px solid #e7b84e" : "1.5px solid #e7dccd",
              background: on ? "#fffaf0" : "#fff",
            }}
          >
            {p.badge && (
              <span style={{
                position: "absolute", top: -10, right: "50%",
                transform: "translateX(50%)", whiteSpace: "nowrap",
                background: "linear-gradient(135deg,#f3d27a,#dca83f)", color: "#5a3d0a",
                fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: ".58rem",
                padding: ".16rem .55rem", borderRadius: 99,
              }}>
                {p.badge}
              </span>
            )}
            <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, color: "#3a2a5c", fontSize: "1.5rem", lineHeight: 1 }}>
              {p.stories}
            </div>
            <div style={{ fontSize: ".74rem", color: "#9a7fb0", margin: ".15rem 0 .5rem" }}>
              סיפורים
            </div>
            <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, color: "#b9842a", fontSize: "1.05rem" }}>
              {p.price}$
            </div>
            <div style={{ fontSize: ".65rem", color: "#b6a48d", marginTop: ".2rem" }}>
              {p.perStory}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Credits Wall ──────────────────────────────────────────────────────────────

function CreditsWall({
  selectedPkg, onSelectPkg, onClose,
}: {
  selectedPkg: PkgId;
  onSelectPkg: (id: PkgId) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      background: "#fff8ef", borderRadius: 24, padding: "2.1rem 1.9rem",
      width: "min(440px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
      textAlign: "center", fontFamily: "'Assistant', sans-serif",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "linear-gradient(135deg, #f3d27a, #dca83f)", color: "#5a3d0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.7rem", margin: "0 auto",
      }}>✦</div>

      <h2 style={{
        fontFamily: "'Rubik', sans-serif", fontSize: "1.3rem", fontWeight: 700,
        color: "#3a2a5c", margin: "1rem 0 .5rem",
      }}>
        ניצלתם את 5 הסיפורים החינמיים
      </h2>
      <p style={{ fontSize: ".96rem", lineHeight: 1.6, color: "#6b5a82", margin: "0 0 1.3rem" }}>
        כדי להמשיך, קבלו חבילת קרדיטים — והפעם הסיפורים מגיעים{" "}
        <b style={{ color: "#5b37b7" }}>מלאים</b>: איור בכל עמוד והקראה קולית.
      </p>

      {/* Perks */}
      <div style={{ textAlign: "right", marginBottom: "1.1rem" }}>
        {PERKS.map((perk) => (
          <div key={perk} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".45rem" }}>
            <span style={{ color: "#2ea36b", fontWeight: 800, fontSize: ".95rem" }}>✓</span>
            <span style={{ fontSize: ".9rem", color: "#4a3a5c" }}>{perk}</span>
          </div>
        ))}
      </div>

      {/* Package cards — click navigates to BuySheet */}
      <PkgCards selectedPkg={selectedPkg} onSelect={onSelectPkg} />

      <div style={{ fontSize: ".78rem", color: "#b6a48d", textAlign: "center", marginBottom: ".3rem" }}>
        בחרו חבילה כדי להמשיך לתשלום
      </div>

      <button
        onClick={onClose}
        style={{ width: "100%", background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".9rem", fontWeight: 600, cursor: "pointer", marginTop: ".65rem" }}
      >
        אולי מאוחר יותר
      </button>
    </div>
  );
}

// ── Buy Sheet ─────────────────────────────────────────────────────────────────

function BuySheet({
  selectedPkg, setSelectedPkg,
  onPurchase, loading, onClose,
}: {
  selectedPkg: PkgId;
  setSelectedPkg: (id: PkgId) => void;
  onPurchase: () => void;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div style={{
      background: "#fff8ef", borderRadius: 24, padding: "2rem 1.8rem",
      width: "min(460px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
      fontFamily: "'Assistant', sans-serif",
    }}>
      {/* Package selection */}
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, color: "#3a2a5c", fontSize: ".95rem", marginBottom: ".7rem" }}>
        בחרו חבילה
      </div>
      <PkgCards selectedPkg={selectedPkg} onSelect={setSelectedPkg} />
      <div style={{ fontSize: ".8rem", color: "#7a6a8c", textAlign: "center", marginBottom: "1.2rem" }}>
        כל הסיפורים בחבילה מלאים — איור בכל עמוד והקראה קולית
      </div>

      {/* Timing note */}
      <div style={{
        display: "flex", alignItems: "center", gap: ".4rem",
        fontSize: ".82rem", fontWeight: 600, borderRadius: 12,
        padding: ".6rem .8rem", margin: ".4rem 0 0",
        background: "#e7f6ec", color: "#2b7a4b",
      }}>
        ✓ הקרדיטים ייטענו מיד עם אישור התשלום
      </div>

      <button onClick={onPurchase} disabled={loading} dir="rtl" style={{ ...GOLD_BTN, opacity: loading ? 0.7 : 1 }}>
        {loading ? "מעביר לפייפאל…" : "שלמו ב‑PayPal"}
      </button>

      <p style={{ textAlign: "center", fontSize: ".74rem", color: "#b6a48d", margin: ".7rem 0 0" }}>
        תשלום חד‑פעמי · הקרדיטים נשמרים בחשבון
      </p>
      <button
        onClick={onClose}
        style={{ display: "block", margin: ".5rem auto 0", background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}
      >
        סגירה
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  view: "creditsWall" | "buySheet";
  onClose: () => void;
}

export default function UpgradeModal({ view, onClose }: Props) {
  const [currentView, setCurrentView] = useState<"creditsWall" | "buySheet">(view);
  const [selectedPkg, setSelectedPkg] = useState<PkgId>("p6");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handlePurchase() {
    setLoading(true);
    try {
      const res = await authFetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pkgId: selectedPkg }),
      });
      const data = await res.json();
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        alert("שגיאה בעת יצירת ההזמנה, נסו שוב");
        setLoading(false);
      }
    } catch {
      alert("שגיאת רשת, נסו שוב");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,5,30,.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "bpRise .25s ease both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {currentView === "creditsWall" ? (
        <CreditsWall
          selectedPkg={selectedPkg}
          onSelectPkg={(id) => { setSelectedPkg(id); setCurrentView("buySheet"); }}
          onClose={onClose}
        />
      ) : (
        <BuySheet
          selectedPkg={selectedPkg}
          setSelectedPkg={setSelectedPkg}
          onPurchase={handlePurchase}
          loading={loading}
          onClose={onClose}
        />
      )}
    </div>
  );
}
