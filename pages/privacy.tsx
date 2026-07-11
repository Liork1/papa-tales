import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LangSwitcher from "@/components/LangSwitcher";

const ACCENT = { main: "#7a4fb0", deep: "#553089" };
const SUPPORT_EMAIL = "support@papa-tales.com";

type Section = { heading: string; paragraphs?: string[]; list?: string[] };
type Content = { title: string; updated: string; sections: Section[]; back: string; terms: string };

function renderWithEmailLink(text: string) {
  const parts = text.split(SUPPORT_EMAIL);
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={`mailto:${SUPPORT_EMAIL}`} style={{ color: ACCENT.deep, fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>,
          part,
        ]
  );
}

const CONTENT: Record<"he" | "en", Content> = {
  he: {
    title: "מדיניות פרטיות",
    updated: "עדכון אחרון: יולי 2026",
    sections: [
      {
        heading: "על האפליקציה",
        paragraphs: [
          "אבא סיפור (Papa Tales) היא אפליקציה ליצירת סיפורי ילדים מחורזים ומאויירים בעברית ובאנגלית. האפליקציה מיועדת לילדים בגילאי 2–10 ולמשפחותיהם.",
        ],
      },
      {
        heading: "איזה מידע אנו אוספים?",
        list: [
          "כתובת דוא\"ל — רק אם בחרת להירשם לחשבון. אורחים יכולים להשתמש באפליקציה ללא הרשמה.",
          "תוכן הסיפורים — הסיפורים שנוצרו נשמרים בחשבונך כדי שתוכל לגשת אליהם בעתיד.",
          "לא אוספים: מיקום, נתוני ילדים ספציפיים, מזהי מכשיר, או מידע פיננסי (תשלומים מעובדים ישירות על ידי PayPal).",
        ],
      },
      {
        heading: "כיצד משתמשים במידע?",
        list: ["יצירת הסיפורים ושמירתם בחשבונך", "אימות זהות (התחברות)", "שיפור השירות"],
      },
      {
        heading: "שיתוף מידע עם צדדים שלישיים",
        paragraphs: [
          "אנו לא מוכרים, משכירים, או משתפים מידע אישי עם צדדים שלישיים לצרכי פרסום. מידע עשוי להיות מעובד על ידי:",
        ],
        list: [
          "Supabase — אחסון בסיס נתונים (שרתים ב-AWS)",
          "Vercel — אירוח האפליקציה",
          "PayPal — עיבוד תשלומים בלבד",
          "OpenRouter / Google — יצירת תוכן הסיפורים (טקסט בלבד, ללא מידע אישי)",
        ],
      },
      {
        heading: "COPPA — הגנה על פרטיות ילדים",
        paragraphs: [
          "האפליקציה מיועדת לשימוש הורים עם ילדיהם. אנו לא אוספים בכוונה מידע אישי ישירות מילדים מתחת לגיל 13. ההורה או האפוטרופוס הוא זה שיוצר את החשבון ואחראי לשימוש.",
        ],
      },
      {
        heading: "אבטחה",
        paragraphs: ["כל הנתונים מאוחסנים בהצפנה. חיבורים לשרת מאובטחים באמצעות HTTPS."],
      },
      {
        heading: "מחיקת נתונים",
        paragraphs: [`לבקשת מחיקת חשבון ונתונים, שלחו מייל ל: ${SUPPORT_EMAIL}. הנתונים יימחקו תוך 30 ימים.`],
      },
      {
        heading: "שינויים במדיניות",
        paragraphs: ["שינויים מהותיים יפורסמו בדף זה. המשך השימוש באפליקציה לאחר שינוי מהווה הסכמה למדיניות המעודכנת."],
      },
      {
        heading: "יש שאלות?",
        paragraphs: [`ניתן לפנות אלינו בכל עת בכתובת: ${SUPPORT_EMAIL}`],
      },
    ],
    back: "חזרה לאפליקציה",
    terms: "תנאי השימוש",
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: July 2026",
    sections: [
      {
        heading: "About the App",
        paragraphs: [
          "Papa Tales is an app that creates rhymed, illustrated children's stories in Hebrew and English. The app is intended for children ages 2–10 and their families.",
        ],
      },
      {
        heading: "What information do we collect?",
        list: [
          "Email address — only if you choose to create an account. Guests can use the app without signing up.",
          "Story content — stories you generate are saved to your account so you can access them later.",
          "We do not collect: location, child-specific data, device identifiers, or financial information (payments are processed directly by PayPal).",
        ],
      },
      {
        heading: "How is information used?",
        list: ["Generating and saving your stories to your account", "Authentication (sign-in)", "Improving the service"],
      },
      {
        heading: "Sharing information with third parties",
        paragraphs: [
          "We do not sell, rent, or share personal information with third parties for advertising purposes. Information may be processed by:",
        ],
        list: [
          "Supabase — database hosting (servers on AWS)",
          "Vercel — application hosting",
          "PayPal — payment processing only",
          "OpenRouter / Google — story content generation (text only, no personal information)",
        ],
      },
      {
        heading: "COPPA — Children's Privacy Protection",
        paragraphs: [
          "The app is intended to be used by parents together with their children. We do not knowingly collect personal information directly from children under 13. A parent or guardian creates the account and is responsible for its use.",
        ],
      },
      {
        heading: "Security",
        paragraphs: ["All data is stored encrypted. Server connections are secured via HTTPS."],
      },
      {
        heading: "Data deletion",
        paragraphs: [`To request deletion of your account and data, email us at: ${SUPPORT_EMAIL}. Data will be deleted within 30 days.`],
      },
      {
        heading: "Changes to this policy",
        paragraphs: ["Material changes will be posted on this page. Continued use of the app after a change constitutes acceptance of the updated policy."],
      },
      {
        heading: "Questions?",
        paragraphs: [`You can reach us any time at: ${SUPPORT_EMAIL}`],
      },
    ],
    back: "Back to app",
    terms: "Terms of Use",
  },
};

const PrivacyPage: NextPage = () => {
  const router = useRouter();
  const locale = (router.locale === "en" ? "en" : "he") as "he" | "en";
  const dir = locale === "en" ? "ltr" : "rtl";
  const C = CONTENT[locale];

  return (
    <>
      <Head>
        <title>{`${C.title} — Papa Tales`}</title>
        <meta
          name="description"
          content={locale === "en" ? "Papa Tales privacy policy." : "מדיניות הפרטיות של אבא סיפור."}
        />
      </Head>

      <div
        dir={dir}
        style={{
          position: "relative",
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2.2rem 1rem 3rem",
          fontFamily: "'Assistant', sans-serif",
        }}
      >
        {/* Starfield background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background:
              "radial-gradient(2px 2px at 12% 20%, rgba(255,255,255,.7), transparent), radial-gradient(1.5px 1.5px at 80% 14%, rgba(255,255,255,.6), transparent), radial-gradient(1.5px 1.5px at 62% 72%, rgba(255,255,255,.45), transparent), radial-gradient(1px 1px at 35% 50%, rgba(255,255,255,.5), transparent), radial-gradient(135% 105% at 50% -25%, #3a2d6e 0%, #241a52 48%, #160f33 100%)",
          }}
        />

        <div
          style={{
            width: "min(720px, 100%)",
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <LangSwitcher variant="dark" />
        </div>

        <div
          style={{
            background: "#fff8ef",
            borderRadius: 26,
            padding: "2rem 2.1rem 2.1rem",
            width: "min(720px, 100%)",
            boxShadow: "0 30px 70px rgba(10,5,30,.55)",
            lineHeight: 1.8,
            color: "#3a2a3a",
          }}
        >
          <h1
            style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: "1.7rem",
              fontWeight: 800,
              color: "#3a2a5c",
              margin: "0 0 .3rem",
            }}
          >
            {C.title}
          </h1>
          <p style={{ fontSize: ".88rem", color: "#9a7fb0", fontWeight: 600, marginBottom: "1.6rem" }}>
            {C.updated}
          </p>

          {C.sections.map((section) => (
            <section key={section.heading} style={{ marginBottom: "1.4rem" }}>
              <h2
                style={{
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: "1.12rem",
                  fontWeight: 700,
                  color: "#5c4a78",
                  margin: "0 0 .5rem",
                }}
              >
                {section.heading}
              </h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} style={{ margin: "0 0 .6rem", fontSize: ".95rem" }}>
                  {renderWithEmailLink(p)}
                </p>
              ))}
              {section.list && (
                <ul style={{ margin: 0, paddingInlineStart: "1.3rem", fontSize: ".95rem" }}>
                  {section.list.map((item, i) => (
                    <li key={i} style={{ marginBottom: ".35rem" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <hr style={{ margin: "1.6rem 0", border: "none", borderTop: "1px solid #e7dccd" }} />
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".8rem" }}>
            <Link
              href="/"
              style={{
                color: ACCENT.deep,
                fontFamily: "'Rubik', sans-serif",
                fontSize: ".9rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {C.back}
            </Link>
            <Link
              href="/terms"
              style={{
                color: "#9a7fb0",
                fontFamily: "'Rubik', sans-serif",
                fontSize: ".9rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {C.terms}
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </>
  );
};

export default PrivacyPage;
