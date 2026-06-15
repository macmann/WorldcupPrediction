"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useStore } from "@/store/useStore";

export function LeagueManageActions({ leagueId, isOwner }: { leagueId: string; isOwner: boolean }) {
  const router = useRouter();
  const { t } = useStore();
  const [isPending, startTransition] = useTransition();

  function submit(action: "leave" | "delete") {
    const confirmation = action === "delete" ? t("league.deleteConfirm") : t("league.leaveConfirm");
    if (!window.confirm(confirmation)) return;

    startTransition(async () => {
      const response = await fetch(`/api/leagues/${leagueId}`, { method: action === "delete" ? "DELETE" : "POST", body: JSON.stringify({ action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error ?? t("leagues.actionFailed"));
        return;
      }
      router.push("/leagues");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
      {isOwner ? (
        <button type="button" disabled={isPending} onClick={() => submit("delete")} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-slate-400">
          {t("league.deleteLeague")}
        </button>
      ) : (
        <button type="button" disabled={isPending} onClick={() => submit("leave")} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:bg-slate-200">
          {t("league.leaveLeague")}
        </button>
      )}
    </div>
  );
}
