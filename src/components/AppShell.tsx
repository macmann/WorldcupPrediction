"use client";

import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { PlatformLogo } from "@/components/Icons";
import { UserProfile } from "@/components/UserProfile";
import { AnnouncementBanner } from "@/components/SystemStatusGate";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { useStore } from "@/store/useStore";

export function AppShell({ children, title = "FFM - WC2026", eyebrow }: { children: React.ReactNode; title?: string; eyebrow?: string }) {
  const { t } = useStore();

  return (
    <AuthGate>
      <AnnouncementPopup />
      <header className="sticky top-0 z-20 bg-gradient-to-br from-navy via-[#0a1b3e] to-[#0c2742] px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-white shadow-[0_18px_44px_rgba(6,20,46,0.18)]">
        <div className="flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] bg-white/10 shadow-lg shadow-emerald-950/20 ring-1 ring-white/15">
            <PlatformLogo className="h-12 w-12" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">{eyebrow ?? t("app.eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          </div>
          <UserProfile />
        </div>
      </header>
      <AnnouncementBanner />
      <section className="-mt-4 min-h-[calc(100vh-8rem)] space-y-5 rounded-t-[2rem] bg-slate-50 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-5">{children}</section>
      <BottomNav />
    </AuthGate>
  );
}
