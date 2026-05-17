"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "@/components/Icons";

export function LeagueActions() {
  const [joinCode, setJoinCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function postLeague(url: string, body: unknown, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!response.ok) throw new Error((await response.json()).error ?? "League action failed");
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "League action failed");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={8} placeholder="Enter join code" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-widest" />
        <button type="button" disabled={isPending || joinCode.length !== 8} onClick={() => postLeague("/api/leagues/join", { joinCode }, "League joined ✓")} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300">Join</button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} placeholder="Create league name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
        <button type="button" disabled={isPending || leagueName.length < 3} onClick={() => postLeague("/api/leagues/create", { name: leagueName }, "League created ✓")} className="flex items-center gap-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"><PlusIcon className="h-4 w-4" /> Create</button>
      </div>
      {message && <p className="text-center text-xs font-bold text-slate-600">{message}</p>}
    </div>
  );
}
