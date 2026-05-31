import type { Metadata, Viewport } from "next";
import { ViewportFrame } from "@/components/ViewportFrame";
import { StoreProvider } from "@/store/useStore";
import { SystemStatusGate } from "@/components/SystemStatusGate";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "FFM - WC2026",
  title: "FFM - WC2026",
  description: "Predict scores, join private leagues, and climb the World Cup leaderboard.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#06142e"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <SystemStatusGate><ViewportFrame>{children}</ViewportFrame></SystemStatusGate>
        </StoreProvider>
      </body>
    </html>
  );
}
