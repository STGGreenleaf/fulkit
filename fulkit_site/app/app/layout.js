import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { VaultProvider } from "../lib/vault";
import { SandboxProvider } from "../lib/sandbox";
import { FabricProvider } from "../lib/fabric";
import DevInspector from "../components/DevInspector";
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
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
    },
    verification: {
      google: "bxotBlliMEej3R9iaE9wMaMdCtF9IWBRsugS2lAN8Uo",
    },
    other: {
      "theme-color": "#EFEDE8",
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
              <DevInspector />
            </FabricProvider>
            </SandboxProvider>
          </VaultProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
