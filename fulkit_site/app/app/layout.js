import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { VaultProvider } from "../lib/vault";
import { SandboxProvider } from "../lib/sandbox";
import { FabricProvider } from "../lib/fabric";
import DevInspector from "../components/DevInspector";

export const metadata = {
  title: "Fülkit — I'll be your bestie",
  description:
    "Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you've saved.",
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
    title: "Fülkit — I'll be your bestie",
    description: "The app that thinks with you.",
    type: "website",
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
