import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from "next/document";

interface Props extends DocumentInitialProps {
  locale: string;
}

export default class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initial = await Document.getInitialProps(ctx);
    return { ...initial, locale: ctx.locale ?? "he" };
  }

  render() {
    const locale = this.props.locale ?? "he";
    const dir = locale === "he" ? "rtl" : "ltr";

    return (
      <Html lang={locale} dir={dir}>
        <Head>
          <meta charSet="utf-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Assistant:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="shortcut icon" href="/favicon.svg" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
