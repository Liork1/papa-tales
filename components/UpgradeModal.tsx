import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { authFetch } from "@/lib/auth-fetch";
import { useUserContext } from "@/lib/user-context";
import { isPlayBillingAvailable, purchaseViaPlayBilling } from "@/lib/play-billing";
import { PKG_TO_PLAY_PRODUCT } from "@/lib/billing-packages";
import { useLocale } from "@/lib/i18n";
import type { Locale } from "@/locales/he";
import TierComparisonModal from "@/components/TierComparisonModal";

// ── Data ──────────────────────────────────────────────────────────────────────

const PACKAGES = [
  { id: "p3",  stories: 3,  usdPrice: 3.49,  ilsPrice: 12, badge: null },
  { id: "p6",  stories: 6,  usdPrice: 6.49,  ilsPrice: 22, badge: "recommended" },
  { id: "p12", stories: 12, usdPrice: 12.49, ilsPrice: 42, badge: "bestValue" },
] as const;

type PkgId = "p3" | "p6" | "p12";

type UpgradeCopy = Locale["upgrade"];

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
  locale,
  copy,
}: {
  selectedPkg: PkgId;
  onSelect: (id: PkgId) => void;
  locale: string;
  copy: UpgradeCopy;
}) {
  const isHebrew = locale === "he";
  return (
    <div style={{ display: "flex", gap: ".6rem", marginBottom: "1rem", alignItems: "stretch" }}>
      {PACKAGES.map((p) => {
        const on = p.id === selectedPkg;
        const price = isHebrew ? p.ilsPrice : p.usdPrice;
        const currency = isHebrew ? "₪" : "$";
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
                {p.badge === "recommended" ? copy.recommended : copy.bestValue}
              </span>
            )}
            <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, color: "#3a2a5c", fontSize: "1.5rem", lineHeight: 1 }}>
              {p.stories}
            </div>
            <div style={{ fontSize: ".74rem", color: "#9a7fb0", margin: ".15rem 0 .5rem" }}>
              {copy.stories}
            </div>
            <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, color: "#b9842a", fontSize: "1.05rem" }}>
              {currency}{isHebrew ? price : price.toFixed(2)}
            </div>
            <div style={{ fontSize: ".65rem", color: "#b6a48d", marginTop: ".2rem" }}>
              {copy.perStory(`${currency}${(price / p.stories).toFixed(2)}`)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Credits Wall ──────────────────────────────────────────────────────────────

function CreditsWall({
  selectedPkg, onSelectPkg, onClose, onOpenTiers, locale, copy,
}: {
  selectedPkg: PkgId;
  onSelectPkg: (id: PkgId) => void;
  onClose: () => void;
  onOpenTiers: () => void;
  locale: string;
  copy: UpgradeCopy;
}) {
  const isHebrew = locale === "he";
  return (
    <div style={{
      background: "#fff8ef", borderRadius: 24, padding: "2.1rem 1.9rem",
      width: "min(440px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
      textAlign: "center", fontFamily: "'Assistant', sans-serif",
    }} dir={isHebrew ? "rtl" : "ltr"}>
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
        {copy.limitTitle}
      </h2>
      <p style={{ fontSize: ".96rem", lineHeight: 1.6, color: "#6b5a82", margin: "0 0 1.3rem" }}>
        {copy.limitBeforeFull}<b style={{ color: "#5b37b7" }}>{copy.fullStories}</b>{copy.limitAfterFull}
      </p>

      {/* Perks */}
      <div style={{ textAlign: isHebrew ? "right" : "left", marginBottom: "1.1rem" }}>
        {copy.perks.map((perk) => (
          <div key={perk} style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".45rem" }}>
            <span style={{ color: "#2ea36b", fontWeight: 800, fontSize: ".95rem" }}>✓</span>
            <span style={{ fontSize: ".9rem", color: "#4a3a5c" }}>{perk}</span>
          </div>
        ))}
      </div>

      {/* Package cards — click navigates to BuySheet */}
      <PkgCards selectedPkg={selectedPkg} onSelect={onSelectPkg} locale={locale} copy={copy} />

      <div style={{ fontSize: ".78rem", color: "#b6a48d", textAlign: "center", marginBottom: ".3rem" }}>
        {copy.chooseToPay}
      </div>

      <button
        onClick={onOpenTiers}
        style={{ width: "100%", background: "none", border: "none", color: "#bda9d8", fontFamily: "'Assistant', sans-serif", fontSize: ".84rem", fontWeight: 600, cursor: "pointer", marginTop: ".7rem" }}
      >
        {copy.compareTiers}
      </button>
      <button
        onClick={onClose}
        style={{ width: "100%", background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".9rem", fontWeight: 600, cursor: "pointer", marginTop: ".4rem" }}
      >
        {copy.later}
      </button>
    </div>
  );
}

// ── Buy Sheet ─────────────────────────────────────────────────────────────────

function BuySheet({
  selectedPkg, setSelectedPkg, onPurchase, loading, onClose, playBilling, locale, copy,
}: {
  selectedPkg: PkgId;
  setSelectedPkg: (id: PkgId) => void;
  onPurchase: () => void;
  loading: boolean;
  onClose: () => void;
  playBilling: boolean;
  locale: string;
  copy: UpgradeCopy;
}) {
  const isHebrew = locale === "he";
  return (
    <div style={{
      background: "#fff8ef", borderRadius: 24, padding: "2rem 1.8rem",
      width: "min(460px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
      fontFamily: "'Assistant', sans-serif",
    }} dir={isHebrew ? "rtl" : "ltr"}>
      {/* Package selection */}
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, color: "#3a2a5c", fontSize: ".95rem", marginBottom: ".7rem" }}>
        {copy.choosePackage}
      </div>
      <PkgCards selectedPkg={selectedPkg} onSelect={setSelectedPkg} locale={locale} copy={copy} />
      <div style={{ fontSize: ".8rem", color: "#7a6a8c", textAlign: "center", marginBottom: "1.2rem" }}>
        {copy.packageIncludes}
      </div>

      {/* Timing note */}
      <div style={{
        display: "flex", alignItems: "center", gap: ".4rem",
        fontSize: ".82rem", fontWeight: 600, borderRadius: 12,
        padding: ".6rem .8rem", margin: ".4rem 0 0",
        background: "#e7f6ec", color: "#2b7a4b",
      }}>
        {copy.creditsInstant}
      </div>

      <button onClick={onPurchase} disabled={loading} style={{ ...GOLD_BTN, opacity: loading ? 0.7 : 1 }}>
        {playBilling
          ? (loading ? copy.processingPayment : copy.payWithGoogle)
          : (loading ? copy.redirectingPayPal : copy.payWithPayPal)}
      </button>

      <p style={{ textAlign: "center", fontSize: ".74rem", color: "#b6a48d", margin: ".7rem 0 0" }}>
        {copy.oneTimePayment}
      </p>
      <button
        onClick={onClose}
        style={{ display: "block", margin: ".5rem auto 0", background: "none", border: "none", color: "#9a7fb0", fontFamily: "'Assistant', sans-serif", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}
      >
        {copy.close}
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
  const router = useRouter();
  const locale = router.locale ?? "he";
  const T = useLocale();
  const copy = T.upgrade;
  const { refresh } = useUserContext();
  const [currentView, setCurrentView] = useState<"creditsWall" | "buySheet">(view);
  const [selectedPkg, setSelectedPkg] = useState<PkgId>("p6");
  const [loading, setLoading] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [playBilling, setPlayBilling] = useState(false);

  useEffect(() => {
    setPlayBilling(isPlayBillingAvailable());
  }, []);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handlePlayBillingPurchase() {
    setLoading(true);
    try {
      const { productId, purchaseToken } = await purchaseViaPlayBilling(PKG_TO_PLAY_PRODUCT[selectedPkg]);
      const res = await authFetch("/api/play-billing/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, purchaseToken }),
      });
      if (res.ok) {
        await refresh();
        onClose();
      } else {
        alert(copy.verifyError);
      }
    } catch {
      // user cancelled the Play Billing sheet, or a transient error — no alert needed
    } finally {
      setLoading(false);
    }
  }

  async function handlePayPalPurchase() {
    setLoading(true);
    try {
      const res = await authFetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pkgId: selectedPkg, locale }),
      });
      const data = await res.json();
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        alert(copy.paymentError);
        setLoading(false);
      }
    } catch {
      alert(copy.networkError);
      setLoading(false);
    }
  }

  const handlePurchase = playBilling ? handlePlayBillingPurchase : handlePayPalPurchase;

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
          onOpenTiers={() => setShowTierModal(true)}
          locale={locale}
          copy={copy}
        />
      ) : (
        <BuySheet
          selectedPkg={selectedPkg}
          setSelectedPkg={setSelectedPkg}
          onPurchase={handlePurchase}
          loading={loading}
          onClose={onClose}
          playBilling={playBilling}
          locale={locale}
          copy={copy}
        />
      )}
      {showTierModal && (
        <TierComparisonModal
          onClose={() => setShowTierModal(false)}
        />
      )}
    </div>
  );
}
