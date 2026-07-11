import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LangSwitcher from "@/components/LangSwitcher";

const ACCENT = { main: "#7a4fb0", deep: "#553089" };
const SUPPORT_EMAIL = "support@papa-tales.com";

type Section = { heading: string; paragraphs?: string[]; list?: string[] };
type Content = { title: string; updated: string; sections: Section[]; back: string; privacy: string };

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
    title: "תנאי שימוש",
    updated: "עדכון אחרון: יולי 2026",
    sections: [
      {
        heading: "הסכמה לתנאים",
        paragraphs: [
          "השימוש באפליקציית אבא סיפור (Papa Tales) מהווה הסכמה לתנאי השימוש המפורטים להלן. אם אינך מסכים לתנאים אלו, אנא הימנע משימוש באפליקציה.",
        ],
      },
      {
        heading: "תיאור השירות",
        paragraphs: [
          "אבא סיפור היא אפליקציה ליצירת סיפורי ילדים מחורזים ומאויירים בעברית ובאנגלית, באמצעות בינה מלאכותית. השירות מיועד לשימוש הורים עם ילדיהם, לילדים בגילאי 2–10.",
        ],
      },
      {
        heading: "חשבון משתמש",
        list: [
          "ניתן להשתמש באפליקציה כאורח, ללא הרשמה, עם מגבלות שימוש.",
          "יצירת חשבון (באמצעות אימייל או Google) מאפשרת שמירת סיפורים וגישה להטבות נוספות.",
          "אתה אחראי לשמירה על סודיות פרטי ההתחברות לחשבונך ולכל פעילות המתבצעת דרכו.",
          "יש להזין פרטים נכונים ועדכניים בעת ההרשמה.",
        ],
      },
      {
        heading: "תוכן שנוצר על ידי בינה מלאכותית",
        paragraphs: [
          "הסיפורים והאיורים נוצרים באמצעות מודלים של בינה מלאכותית. אנו עושים מאמץ לוודא שהתוכן מתאים לילדים, אך איננו יכולים להבטיח שהתוכן יהיה נקי מטעויות או אי-דיוקים בכל מקרה.",
          "אין להשתמש באפליקציה כדי ליצור תוכן פוגעני, בלתי הולם, או מפר זכויות יוצרים.",
        ],
      },
      {
        heading: "תשלומים ורכישות",
        paragraphs: [
          "חלק מהתכונות באפליקציה כרוכות ברכישת קרדיטים או מנוי בתשלום, המעובד באמצעות PayPal. כל הרכישות כפופות למדיניות הביטולים וההחזרים כפי שמוצגת בעת הרכישה.",
        ],
      },
      {
        heading: "קניין רוחני",
        paragraphs: [
          "כל הזכויות באפליקציה עצמה (עיצוב, קוד, לוגו) שייכות לאבא סיפור. הסיפורים שנוצרים עבורך באמצעות חשבונך זמינים לשימושך האישי והמשפחתי.",
        ],
      },
      {
        heading: "הגבלת אחריות",
        paragraphs: [
          "השירות ניתן כמות שהוא (\"as is\"), ללא אחריות מכל סוג. איננו אחראים לנזקים עקיפים הנובעים משימוש באפליקציה, ככל שהדבר מותר על פי דין.",
        ],
      },
      {
        heading: "הפסקת שימוש",
        paragraphs: [
          "אנו רשאים להשעות או לסגור חשבונות המפרים תנאים אלו. ניתן לבקש סגירת חשבון ומחיקת נתונים בכל עת בפנייה אלינו.",
        ],
      },
      {
        heading: "שינויים בתנאים",
        paragraphs: ["אנו רשאים לעדכן תנאים אלו מעת לעת. שינויים מהותיים יפורסמו בדף זה. המשך השימוש באפליקציה לאחר שינוי מהווה הסכמה לתנאים המעודכנים."],
      },
      {
        heading: "יש שאלות?",
        paragraphs: [`ניתן לפנות אלינו בכל עת בכתובת: ${SUPPORT_EMAIL}`],
      },
    ],
    back: "חזרה לאפליקציה",
    privacy: "מדיניות הפרטיות",
  },
  en: {
    title: "Terms of Use",
    updated: "Last updated: July 2026",
    sections: [
      {
        heading: "Agreement to Terms",
        paragraphs: [
          "By using the Papa Tales app, you agree to the terms of use described below. If you do not agree to these terms, please do not use the app.",
        ],
      },
      {
        heading: "Description of Service",
        paragraphs: [
          "Papa Tales is an app that creates rhymed, illustrated children's stories in Hebrew and English using artificial intelligence. The service is intended for parents to use together with their children, ages 2–10.",
        ],
      },
      {
        heading: "User Accounts",
        list: [
          "You can use the app as a guest, without signing up, subject to usage limits.",
          "Creating an account (via email or Google) lets you save stories and access additional benefits.",
          "You are responsible for keeping your account credentials confidential and for all activity under your account.",
          "You must provide accurate and current information when creating an account.",
        ],
      },
      {
        heading: "AI-Generated Content",
        paragraphs: [
          "Stories and illustrations are generated using AI models. We make an effort to keep content age-appropriate, but we cannot guarantee it will always be free of errors or inaccuracies.",
          "You may not use the app to generate offensive, inappropriate, or copyright-infringing content.",
        ],
      },
      {
        heading: "Payments and Purchases",
        paragraphs: [
          "Some features require purchasing credits or a paid subscription, processed via PayPal. All purchases are subject to the cancellation and refund policy shown at the time of purchase.",
        ],
      },
      {
        heading: "Intellectual Property",
        paragraphs: [
          "All rights to the app itself (design, code, logo) belong to Papa Tales. Stories generated for you through your account are available for your personal and family use.",
        ],
      },
      {
        heading: "Limitation of Liability",
        paragraphs: [
          "The service is provided \"as is\", without warranties of any kind. We are not liable for indirect damages arising from use of the app, to the extent permitted by law.",
        ],
      },
      {
        heading: "Termination",
        paragraphs: [
          "We may suspend or close accounts that violate these terms. You can request account closure and data deletion at any time by contacting us.",
        ],
      },
      {
        heading: "Changes to These Terms",
        paragraphs: ["We may update these terms from time to time. Material changes will be posted on this page. Continued use of the app after a change constitutes acceptance of the updated terms."],
      },
      {
        heading: "Questions?",
        paragraphs: [`You can reach us any time at: ${SUPPORT_EMAIL}`],
      },
    ],
    back: "Back to app",
    privacy: "Privacy Policy",
  },
};

const TermsPage: NextPage = () => {
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
          content={locale === "en" ? "Papa Tales terms of use." : "תנאי השימוש של אבא סיפור."}
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
              href="/privacy"
              style={{
                color: "#9a7fb0",
                fontFamily: "'Rubik', sans-serif",
                fontSize: ".9rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {C.privacy}
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

export default TermsPage;
