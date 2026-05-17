export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-3xl bg-white p-4 shadow-card ${className}`}>{children}</article>;
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{eyebrow}</p>}
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
    </div>
  );
}
