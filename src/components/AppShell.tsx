import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { PlatformLogo } from "@/components/Icons";
import { UserProfile } from "@/components/UserProfile";
import { AnnouncementBanner } from "@/components/SystemStatusGate";

export function AppShell({ children, title = "FFM - WC2026", eyebrow = "2026 Pool" }: { children: React.ReactNode; title?: string; eyebrow?: string }) {
  return (
    <AuthGate>
      <AnnouncementBanner />
      <header className="sticky top-0 z-20 bg-navy px-5 pb-8 pt-6 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-emerald-950/20 ring-1 ring-white/15">
            <PlatformLogo className="h-12 w-12" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          </div>
          <UserProfile />
        </div>
      </header>
      <section className="-mt-4 min-h-[calc(100vh-8rem)] space-y-4 rounded-t-[2rem] bg-slate-50 px-4 pb-28 pt-5">{children}</section>
      <BottomNav />
    </AuthGate>
  );
}
