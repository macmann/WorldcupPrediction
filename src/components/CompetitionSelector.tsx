"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { platformAction } from "@/lib/platformClient";
export function CompetitionSelector() {
  const { t, user } = useStore(); const router = useRouter();
  const [items, setItems] = useState<{ id: string; label: string }[]>([]); const [value, setValue] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/platform/catalog").then(r => r.json()), fetch("/api/platform").then(r => r.json())]).then(([catalog, view]) => {
      if (!active) return;
      setItems((catalog.competitions ?? []).flatMap((c: { name: string; seasons: { id: string; displayName: string }[] }) => c.seasons.map(s => ({ id: s.id, label: `${c.name} · ${s.displayName}` })))); setValue(view.view?.season.id ?? "");
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  if (!items.length) return null;
  return <label className="mt-4 block text-xs font-bold text-emerald-100"><span>{t("platform.competition")}</span><select value={value} disabled={busy} aria-label={t("platform.competition")} className="mt-1 w-full rounded-xl border border-white/20 bg-navy px-3 py-2 text-sm text-white" onChange={async e => {
    const next = e.target.value; setBusy(true);
    try { await platformAction({ action: "context", seasonId: next }); setValue(next); window.dispatchEvent(new Event("football-context")); router.refresh(); } finally { setBusy(false); }
  }}>{items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>;
}
