export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-[1.5rem] bg-white p-5 shadow-card ring-1 ring-slate-100/80 ${className}`}>{children}</article>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-card ring-1 ring-slate-100/80">
      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-3 h-7 w-3/4 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-[1.25rem] bg-slate-100" />)}
      </div>
    </div>
  );
}
