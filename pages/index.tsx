import type { NextPage } from "next";
import Head from "next/head";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Papa Tales - יוצר סיפורים לילדים</title>
        <meta name="description" content="יצירת סיפורים לילדים בעברית בעזרת בינה מלאכותית" />
        <meta charSet="utf-8" />
      </Head>
      <main style={{ direction: "rtl", fontFamily: "sans-serif", padding: "2rem" }}>
        <h1>Papa Tales 📖</h1>
        <p>יוצר סיפורים לילדים בעברית בעזרת בינה מלאכותית</p>
        <p>
          השתמש ב-<code>POST /api/generate-story</code> לייצור סיפורים.
        </p>
      </main>
    </>
  );
};

export default Home;
