import "./globals.css";
import { AuthProvider } from "../lib/auth";
import { VaultProvider } from "../lib/vault";
import { FabricProvider } from "../lib/fabric";
import DevInspector from "../components/DevInspector";

export const metadata = {
  title: "Fülkit — I'll be your bestie",
  description:
    "Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you've saved.",
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
            <FabricProvider>
              {children}
              <DevInspector />
            </FabricProvider>
          </VaultProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
