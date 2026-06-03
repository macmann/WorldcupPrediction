"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/Icons";
import { useStore } from "@/store/useStore";

export function LeagueActions() {
  const router = useRouter();
  const { t } = useStore();
  const [joinCode, setJoinCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function postLeague(url: string, body: unknown, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? t("leagues.actionFailed"));
        setMessage(success);
        setJoinCode("");
        setLeagueName("");
        router.refresh();
        if (data.league?.id) router.push(`/leagues/${data.league.id}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t("leagues.actionFailed"));
      }
    });
  }

  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={8} placeholder={t("leagues.enterJoinCode")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-widest" />
        <button type="button" disabled={isPending || joinCode.length !== 8} onClick={() => postLeague("/api/leagues/join", { joinCode }, t("leagues.joinedSuccess"))} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300">{t("leagues.join")}</button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} placeholder={t("leagues.createName")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
        <button type="button" disabled={isPending || leagueName.length < 3} onClick={() => postLeague("/api/leagues/create", { name: leagueName }, t("leagues.createdSuccess"))} className="flex items-center gap-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"><PlusIcon className="h-4 w-4" /> {t("leagues.create")}</button>
      </div>
      {message && <p className="text-center text-xs font-bold text-slate-600">{message}</p>}
    </div>
  );
}
