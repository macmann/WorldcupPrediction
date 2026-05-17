import Link from "next/link";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/match-center", label: "Predict" },
  { href: "/leagues", label: "Leagues" },
  { href: "/history", label: "History" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 pb-24 shadow-2xl">
      <header className="bg-navy px-5 pb-8 pt-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">2026 Pool</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">World Cup Predictor</h1>
      </header>
      <section className="-mt-4 space-y-4 rounded-t-[2rem] bg-slate-50 px-4 pt-5">{children}</section>
      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1 text-center text-xs font-semibold text-slate-600">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="rounded-2xl px-2 py-3 hover:bg-emerald-50 hover:text-emerald-700">
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
