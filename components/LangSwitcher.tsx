import { useState } from "react";
import { useRouter } from "next/router";

const LANGS = [
  { code: "he", label: "עברית" },
  { code: "en", label: "English" },
];

interface LangSwitcherProps {
  variant: "light" | "dark";
}

export default function LangSwitcher({ variant }: LangSwitcherProps) {
  const router = useRouter();
  const current = router.locale ?? "he";
  const [open, setOpen] = useState(false);

  const currentLabel = LANGS.find((l) => l.code === current)?.label ?? "עברית";

  const btnStyle: React.CSSProperties =
    variant === "light"
      ? {
          display: "inline-flex", alignItems: "center", gap: ".3rem",
          background: "#f3eefb", border: "1px solid #e2d6f2", borderRadius: "99px",
          padding: ".34rem .68rem", color: "#5b37b7",
          fontFamily: "'Rubik', sans-serif", fontSize: ".78rem", fontWeight: 700,
          cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1,
        }
      : {
          display: "inline-flex", alignItems: "center", gap: ".3rem",
          background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.22)",
          borderRadius: "99px", padding: ".34rem .68rem",
          color: "rgba(245,235,220,.9)",
          fontFamily: "'Rubik', sans-serif", fontSize: ".78rem", fontWeight: 700,
          cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1,
        };

  const pick = (code: string) => {
    setOpen(false);
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    router.push(router.pathname, router.asPath, { locale: code });
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} style={btnStyle}>
        🌐 ▾
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 55 }}
          />
          {/* Menu */}
          <div
            style={{
              position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0,
              zIndex: 56, background: "#fff", borderRadius: 14,
              boxShadow: "0 14px 40px rgba(10,5,30,.3)",
              padding: ".35rem", minWidth: 150,
            }}
          >
            {LANGS.map((l) => {
              const active = l.code === current;
              return (
                <button
                  key={l.code}
                  onClick={() => pick(l.code)}
                  style={{
                    display: "block", width: "100%", padding: ".55rem .85rem",
                    border: "none", borderRadius: 10, cursor: "pointer",
                    textAlign: "right", direction: "rtl",
                    fontFamily: "'Rubik', sans-serif", fontSize: ".88rem",
                    background: active ? "#efe6fb" : "transparent",
                    color: active ? "#3a2a5c" : "#5a5a5a",
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
