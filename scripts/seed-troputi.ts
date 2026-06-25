import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Source: seed-stories/seed.tsx — bookId 4
// NOTE: The text content appears to be a placeholder — replace with the real
// טרופותי text before running if you have the correct content.
const story = {
  title: "טרופותי",
  author: "ג׳וליה דונלדסון",
  content: `פעם היה אריה שאהב רק תות.
לא בשר ולא גבינה ,רק תות פשוט.
לא דיסה ולא קקאו ,רק תות הוא רצה,

תות .לא לחם ,לא ארז ולא
ביצה ,רק תות.

וביער הרחוק ההוא ,שבו הוא היה גר,
לא היה תות.

ישב האריה ובכה ,ובכה ,ואמר:
אני רוצה תות.

באה אמא שלו ,הלביאה ,ואמרה
לו ,תשמע ,חמוד - ,אין תות.
ביער שלנו אין תות.
יש פטל ,שזיפים ,סיגליות ,מרק,
יש אורז ,צ'יפס ,קבב
וארטיק ומיץ ממותק,
אבל תות אין .אין!

תפסיק לבכות ותפסיק להתאונן.

אבל האריה בכה ורצה רק תות,

ואת עיניו נגב ונגב כל הזמן בסמרטוט

ורצה רק תות.
כל הזמן בכה ,וכל הזמן רצה תות ותות.

פעם אחת הלכו ילדים קטנים לטייל ביער ההוא ,ולילדים ההם היה תות.
כי במקום שבו הם גרו ושממנו לטיול יצאו היה תות.

וכשהם יצאו לטיול ,אמא שלהם שמה להם בתיק האוכל תות,
כדי שאם פתאום יהיו רעבים ,יוכלו לאכול תות.

הרבה תות...

ראה האריה את הילדים
והריח תות.

התקרב אליהם ואמר:

תנו לי תות!

הילדים נבהלו מאד.
הם פחדו מחיות גדולות.
והם גם לא הבינו את שפת האריות.
ולא ידעו שהוא מבקש תות.
הם חשבו שהוא רוצה לטרוף אותם אולי –
אז הם ברחו .ברחו מהר מהר ודי.

וכשהם ברחו ,נפלו להם תיקי האוכל עם התות
והאריה הרים את התיקים והתחיל לאכול את התות.

אכל עוד תות
עוד תות

עד שגמר הכל ואמר:

פויה! אני לא אוהב תות.

אני בכלל לא אוהב תות.
זאת היתה פשוט טעות
כל העניין הזה עם התות.

ומאז הוא אוכל רק מה שאמא שלו מכינה
ולא רוצה דברים שאין ,ושרק לילדים אחרים יש.

הוא אוכל ביצה ולחם וגבינה לבנה
והוא כבר לא בוכה ולא מתנהג כמו טיפש.`,
  theme: "learning",
  age_group: "4-6",
  keywords: ["הרפתקה", "חיות", "לקח", "אומץ", "עזרה"],
  rhyme_scheme: "AABB",
  language: "he",
  word_count: 220,
};

async function run() {
  console.log(`Inserting "${story.title}" by ${story.author}...`);

  const { error } = await supabase.from("stories").insert(story);

  if (error) {
    console.error("Error inserting story:", error.message);
    process.exit(1);
  }

  console.log("Done.");
}

run();
