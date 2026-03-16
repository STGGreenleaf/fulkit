import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "../lib/auth";
import { VaultProvider } from "../lib/vault";
import { SandboxProvider } from "../lib/sandbox";
import { FabricProvider } from "../lib/fabric";
import DevInspector from "../components/DevInspector";
import QuickCapture from "../components/QuickCapture";
import InstallPrompt from "../components/InstallPrompt";
import { getSupabaseAdmin } from "../lib/supabase-server";

const DEFAULTS = {
  title: "F\u00FClkit \u2014 I'll be your bestie",
  description: "Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you've saved.",
  ogTitle: "F\u00FClkit \u2014 I'll be your bestie",
  ogDescription: "The app that thinks with you.",
};

export async function generateMetadata() {
  let meta = null;
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("site_metadata").select("*").limit(1).single();
    if (data) meta = data;
  } catch {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fulkit.app";
  const ogImageUrl = meta?.og_image_url || `${siteUrl}/api/og`;
  const ogImages = [{ url: ogImageUrl, width: 1200, height: 630 }];

  return {
    title: meta?.title || DEFAULTS.title,
    description: meta?.description || DEFAULTS.description,
    ...(meta?.keywords && { keywords: meta.keywords.split(",").map(k => k.trim()) }),
    ...(meta?.author && { authors: [{ name: meta.author }] }),
    robots: "index, follow",
    ...(meta?.canonical_url && { alternates: { canonical: meta.canonical_url } }),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    openGraph: {
      title: meta?.og_title || DEFAULTS.ogTitle,
      description: meta?.og_description || DEFAULTS.ogDescription,
      type: "website",
      siteName: meta?.og_site_name || "F\u00FClkit",
      locale: "en_US",
      url: meta?.canonical_url || siteUrl,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      ...(meta?.twitter_handle && { site: meta.twitter_handle, creator: meta.twitter_handle }),
      ...(meta?.twitter_image_url && { images: [meta.twitter_image_url] }),
    },
    verification: {
      google: "bxotBlliMEej3R9iaE9wMaMdCtF9IWBRsugS2lAN8Uo",
    },
    other: {
      "theme-color": "#EFEDE8",
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": "F\u00FClkit",
      "application-name": "F\u00FClkit",
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <VaultProvider>
            <SandboxProvider>
            <FabricProvider>
              {children}
              <QuickCapture />
              <InstallPrompt />
              <DevInspector />
            </FabricProvider>
            </SandboxProvider>
          </VaultProvider>
        </AuthProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})}`}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-94X31TXJ2F" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-94X31TXJ2F');`}
        </Script>
      </body>
    </html>
  );
}
