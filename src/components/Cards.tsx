export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-3xl bg-white p-4 shadow-card ${className}`}>{children}</article>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{eyebrow}</p>}
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-3 h-7 w-3/4 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    </div>
  );
}
