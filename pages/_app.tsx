import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/react'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>GitTempo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Visualize productivity by members over any time range. Pulls previous 500 commits."
        />

        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon-v2.ico" />
        <link rel="icon" type="image/png" href="/logo.png" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon-v2.ico" />
        <link rel="apple-touch-icon" href="/favicon-v2.ico" />
        {/* Optional PNG fallback if you have it */}
        {/* <link rel="icon" type="image/png" href="/favicon.png" /> */}

        {/* Open Graph & social preview */}
        <meta property="og:title" content="GitTempo" />
        <meta
          property="og:description"
          content="Visualize productivity by members over any time range. Pulls previous 500 commits."
        />
        <meta property="og:image" content="https://gittempo.com/logo.png" />
        <meta property="og:url" content="https://gittempo.com" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Structured Data for Google */}
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
      <SpeedInsights />
      <Analytics />
    </>
  );
}