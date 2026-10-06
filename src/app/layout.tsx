import type { Metadata, Viewport } from "next";
import { ViewportFrame } from "@/components/ViewportFrame";
import { StoreProvider } from "@/store/useStore";
import { SystemStatusGate } from "@/components/SystemStatusGate";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Football Friends",
  title: "Football Friends",
  description: "Predict scores, join private leagues, and compete across football seasons.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ["/logo.svg", "/icon-192.png", "/icon-512.png"],
    apple: "/icon-192.png"
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
        <ServiceWorkerRegistration />
        <StoreProvider>
          <SystemStatusGate><ViewportFrame>{children}</ViewportFrame></SystemStatusGate>
        </StoreProvider>
      </body>
    </html>
  );
}
