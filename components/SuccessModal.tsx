interface Props {
  onClose: () => void;
  stories?: number;
}

const ACCENT = { main: "#7a4fb0", deep: "#553089" };

export default function SuccessModal({ onClose, stories = 6 }: Props) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,5,30,.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "bpRise .3s ease both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff8ef", borderRadius: 24, padding: "2.4rem 2rem",
        width: "min(420px, 100%)", boxShadow: "0 30px 70px rgba(10,5,30,.55)",
        textAlign: "center", fontFamily: "'Assistant', sans-serif",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #f3d27a, #dca83f)", color: "#5a3d0a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2rem", margin: "0 auto",
          animation: "bpPop .5s ease both",
        }}>✦</div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: ".4rem",
          background: "#e7f6ec", color: "#2b7a4b", fontWeight: 700, fontSize: ".8rem",
          padding: ".35rem .85rem", borderRadius: 99, marginTop: ".9rem",
        }}>
          ✓ שולם · נטען מיד
        </div>

        <h2 style={{
          fontFamily: "'Rubik', sans-serif", fontSize: "1.36rem", fontWeight: 800,
          color: "#3a2a5c", margin: ".7rem 0 .5rem",
        }}>
          הקרדיטים נוספו!
        </h2>
        <p style={{ fontSize: ".98rem", lineHeight: 1.65, color: "#6b5a82", margin: "0 0 1.4rem" }}>
          יש לכם עכשיו{" "}
          <b style={{ color: "#b9842a" }}>{stories} סיפורים מלאים</b> — עם איור בכל עמוד והקראה קולית.
          בואו ניצור את הראשון.
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: ".9rem", border: "none", borderRadius: 16,
            color: "#fff", fontFamily: "'Rubik', sans-serif",
            fontSize: "1.04rem", fontWeight: 700, cursor: "pointer",
            background: `linear-gradient(135deg, ${ACCENT.main}, ${ACCENT.deep})`,
            boxShadow: `0 10px 24px ${ACCENT.main}55`,
          }}
        >
          יצירת סיפור מלא ✨
        </button>
      </div>
    </div>
  );
}
