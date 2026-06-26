import React from "react";

interface Props {
  onClose: () => void;
  onGetCredits?: () => void;
}

const TIERS = [
  {
    name: "אורח",
    icon: "🌙",
    quota: "סיפור 1 חינם · ללא הרשמה",
    premium: false,
    features: [
      { ok: true,  text: "סיפור מחורז שנכתב במיוחד" },
      { ok: true,  text: "כריכה צבעונית מאוירת" },
      { ok: false, text: "איור בעמודי הפנים" },
      { ok: false, text: "הקראה קולית" },
      { ok: false, text: "שמירת הסיפור בחשבון" },
    ],
  },
  {
    name: "חשבון חינם",
    icon: "🎁",
    quota: "5 סיפורים חינם · אחרי הרשמה",
    premium: false,
    features: [
      { ok: true,  text: "5 סיפורים — כולם נשמרים בחשבון" },
      { ok: true,  text: "סיפור מחורז + כריכה מאוירת" },
      { ok: true,  text: "חזרה לכל הסיפורים שיצרתם" },
      { ok: false, text: "איור בעמודי הפנים" },
      { ok: false, text: "הקראה קולית" },
    ],
  },
  {
    name: "בעל קרדיטים",
    icon: "✦",
    quota: "סיפורים מלאים · חבילות מ‑3$",
    premium: true,
    features: [
      { ok: true, text: "איור צבעוני בכל עמוד" },
      { ok: true, text: "הקראה קולית של הסיפור" },
      { ok: true, text: "כל הסיפורים נשמרים לתמיד" },
      { ok: true, text: "סיפור מלא לכל קרדיט · ללא הגבלת זמן" },
    ],
  },
];

export default function TierComparisonModal({ onClose, onGetCredits }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1010,
        background: "rgba(10,5,30,.62)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.2rem",
      }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(420px, 100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#fff8ef",
          borderRadius: 24,
          padding: "1.7rem 1.3rem 1.4rem",
          boxShadow: "0 30px 80px rgba(10,5,30,.6)",
          animation: "bpRise .25s ease both",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: ".9rem", left: ".9rem",
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "#efe6fb", color: "#4a2d72",
            fontSize: ".95rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: "1.1rem" }}>
          <h2 style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: "1.28rem", color: "#3a2a5c", margin: 0 }}>
            מה מקבלים בכל שכבה
          </h2>
          <p style={{ fontSize: ".85rem", color: "#9a7fb0", margin: ".3rem 0 0" }}>
            ככל שמתקדמים — הסיפור מקבל יותר חיים
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                position: "relative",
                background: "#fff",
                borderRadius: 18,
                padding: "1.25rem 1.2rem 1rem",
                boxShadow: "0 6px 18px rgba(10,5,30,.07)",
                border: tier.premium ? "1.5px solid #e7b84e" : "1px solid #f0e6d8",
              }}
            >
              {tier.premium && (
                <span style={{
                  position: "absolute", top: -10, right: "1.3rem",
                  background: "linear-gradient(135deg,#f3d27a,#dca83f)",
                  color: "#5a3d0a",
                  fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: ".62rem",
                  padding: ".18rem .65rem", borderRadius: 99,
                  boxShadow: "0 4px 10px rgba(217,168,63,.45)",
                }}>
                  החוויה המלאה
                </span>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: ".85rem" }}>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 13, fontSize: "1.4rem", flexShrink: 0,
                  background: tier.premium ? "linear-gradient(135deg,#f3d27a,#dca83f)" : "#efe6fb",
                  color: tier.premium ? "#5a3d0a" : "#4a2d72",
                }}>
                  {tier.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: "1.02rem", color: "#3a2a5c" }}>
                    {tier.name}
                  </div>
                  <div style={{
                    fontSize: ".79rem", fontWeight: 600, marginTop: ".12rem",
                    color: tier.premium ? "#b9842a" : "#9a7fb0",
                  }}>
                    {tier.quota}
                  </div>
                </div>
              </div>

              {tier.features.map((f) => (
                <div key={f.text} style={{ display: "flex", alignItems: "center", gap: ".55rem", marginBottom: ".42rem" }}>
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    fontSize: ".68rem", fontWeight: 800,
                    background: f.ok ? "#e7f6ec" : "#f0eaf4",
                    color: f.ok ? "#2ea36b" : "#b6a48d",
                  }}>
                    {f.ok ? "✓" : "✕"}
                  </span>
                  <span style={{ fontSize: ".89rem", lineHeight: 1.4, color: f.ok ? "#4a3a5c" : "#9a8aaa" }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1.2rem" }}>
          {onGetCredits ? (
            <button
              onClick={onGetCredits}
              style={{
                width: "100%", padding: ".9rem", border: "none", borderRadius: 16,
                color: "#5a3d0a", fontFamily: "'Rubik', sans-serif",
                fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                background: "linear-gradient(135deg,#f3d27a,#dca83f)",
                boxShadow: "0 10px 24px rgba(217,168,63,.45)",
              }}
            >
              קבלו קרדיטים ✦
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: ".9rem", border: "none", borderRadius: 16,
                color: "#fff", fontFamily: "'Rubik', sans-serif",
                fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                background: "linear-gradient(135deg,#7a4fb0,#553089)",
                boxShadow: "0 10px 24px #7a4fb055",
              }}
            >
              הבנתי
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
