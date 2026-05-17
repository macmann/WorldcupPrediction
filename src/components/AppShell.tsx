import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";

export function AppShell({ children, title = "WC Predictor", eyebrow = "2026 Pool" }: { children: React.ReactNode; title?: string; eyebrow?: string }) {
  return (
    <AuthGate>
      <header className="sticky top-0 z-20 bg-navy px-5 pb-8 pt-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
      </header>
      <section className="-mt-4 min-h-[calc(100vh-8rem)] space-y-4 rounded-t-[2rem] bg-slate-50 px-4 pb-28 pt-5">{children}</section>
      <BottomNav />
    </AuthGate>
  );
}
