import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>GitTempo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Visualize commit activity from GitHub repos in the last 72 hours."
        />

        {/* Favicon for browser tab */}
        <link rel="icon" href="/favicon.ico" />

        {/* Social Preview */}
        <meta property="og:title" content="GitTempo" />
        <meta
          property="og:description"
          content="Visualize GitHub commit activity in the last 72 hours."
        />
        <meta property="og:image" content="https://gittempo.com/logo.png" />
        <meta property="og:url" content="https://gittempo.com" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Structured Data for Google Search */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "GitTempo",
            url: "https://gittempo.com",
            publisher: {
              "@type": "Organization",
              name: "GitTempo",
              logo: {
                "@type": "ImageObject",
                url: "https://gittempo.com/logo.png",
              },
            },
            potentialAction: {
              "@type": "SearchAction",
              target: "https://gittempo.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Head>
      <Component {...pageProps} />
    </>
  );
}