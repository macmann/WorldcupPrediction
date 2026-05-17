import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/store/useStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Fantasy Myanmar - WC 2026",
  description: "Predict scores, join private leagues, and climb the World Cup leaderboard.",
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
          <div className="min-h-dvh bg-slate-200 md:flex md:items-stretch md:justify-center">
            <div className="mobile-app relative h-dvh w-full max-w-[400px] overflow-y-auto overflow-x-hidden border-x border-slate-300 bg-slate-50 shadow-2xl">
              {children}
            </div>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
