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
          background: "#fff8ef",
          borderRadius: 24,
          padding: "1.2rem 1.1rem .9rem",
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

        <div style={{ textAlign: "center", marginBottom: ".65rem" }}>
          <h2 style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#3a2a5c", margin: 0 }}>
            מה מקבלים בכל שכבה
          </h2>
          <p style={{ fontSize: ".8rem", color: "#9a7fb0", margin: ".2rem 0 0" }}>
            ככל שמתקדמים — הסיפור מקבל יותר חיים
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                position: "relative",
                background: "#fff",
                borderRadius: 16,
                padding: ".8rem 1rem .65rem",
                boxShadow: "0 4px 14px rgba(10,5,30,.07)",
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

              <div style={{ display: "flex", alignItems: "center", gap: ".55rem", marginBottom: ".55rem" }}>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 38, borderRadius: 11, fontSize: "1.2rem", flexShrink: 0,
                  background: tier.premium ? "linear-gradient(135deg,#f3d27a,#dca83f)" : "#efe6fb",
                  color: tier.premium ? "#5a3d0a" : "#4a2d72",
                }}>
                  {tier.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: ".97rem", color: "#3a2a5c" }}>
                    {tier.name}
                  </div>
                  <div style={{
                    fontSize: ".76rem", fontWeight: 600, marginTop: ".08rem",
                    color: tier.premium ? "#b9842a" : "#9a7fb0",
                  }}>
                    {tier.quota}
                  </div>
                </div>
              </div>

              {tier.features.map((f) => (
                <div key={f.text} style={{ display: "flex", alignItems: "center", gap: ".45rem", marginBottom: ".28rem" }}>
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    fontSize: ".6rem", fontWeight: 800,
                    background: f.ok ? "#e7f6ec" : "#f0eaf4",
                    color: f.ok ? "#2ea36b" : "#b6a48d",
                  }}>
                    {f.ok ? "✓" : "✕"}
                  </span>
                  <span style={{ fontSize: ".84rem", lineHeight: 1.35, color: f.ok ? "#4a3a5c" : "#9a8aaa" }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: ".75rem" }}>
          {onGetCredits ? (
            <button
              onClick={onGetCredits}
              style={{
                width: "100%", padding: ".75rem", border: "none", borderRadius: 14,
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
                width: "100%", padding: ".75rem", border: "none", borderRadius: 14,
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
