"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, SectionTitle } from "@/components/Cards";
import { TeamName } from "@/components/TeamName";
import { formatAppDateTime } from "@/lib/dateTime";
import { useStore } from "@/store/useStore";

const bracketStages = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"] as const;
type Fixture = { id: number; stage: string; kickoffTime: string; status: string; homeTeam: string; awayTeam: string; homeScore?: number | null; awayScore?: number | null; homeFlagEmoji?: string | null; awayFlagEmoji?: string | null };
type Payload = { knockoutFixtures: Fixture[] };

function stageLabel(stage: string) {
  const labels: Record<string, string> = { ROUND_OF_32: "Round of 32", ROUND_OF_16: "Round of 16", QUARTER_FINAL: "Quarter Final", SEMI_FINAL: "Semi Final", THIRD_PLACE: "Third Place Match", FINAL: "Final" };
  return labels[stage] ?? stage.replaceAll("_", " ");
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  return <article className="min-w-[15rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">{formatAppDateTime(fixture.kickoffTime)}</p>
    <div className="space-y-2 text-sm font-bold text-slate-800">
      <div className="flex items-center justify-between gap-2"><TeamName name={fixture.homeTeam} flagEmoji={fixture.homeFlagEmoji} nameClassName="truncate" /><span className="font-black">{fixture.homeScore ?? ""}</span></div>
      <div className="flex items-center justify-between gap-2"><TeamName name={fixture.awayTeam} flagEmoji={fixture.awayFlagEmoji} nameClassName="truncate" /><span className="font-black">{fixture.awayScore ?? ""}</span></div>
    </div>
  </article>;
}

export function TournamentGroupsTable() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useStore();

  useEffect(() => {
    if (!isVisible || data) return;
    fetch("/api/tournaments/view", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Unable to load bracket");
        return response.json() as Promise<Payload>;
      })
      .then(setData)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load bracket"));
  }, [data, isVisible]);

  const fixturesByStage = useMemo(() => {
    const grouped = new Map<string, Fixture[]>();
    for (const fixture of data?.knockoutFixtures ?? []) grouped.set(fixture.stage, [...(grouped.get(fixture.stage) ?? []), fixture]);
    return grouped;
  }, [data]);

  return <Card>
    <SectionTitle eyebrow={t("winners.groupsEyebrow")} title={t("winners.groupsTitle")} />
    <p className="mt-2 text-sm leading-6 text-slate-600">{t("winners.groupsDescription")}</p>
    <button type="button" aria-expanded={isVisible} aria-controls="wc26-knockout-bracket" onClick={() => setIsVisible((visible) => !visible)} className="mt-4 flex w-full items-center justify-between rounded-2xl bg-navy px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-slate-950/15 transition active:scale-[0.98]">
      <span>{isVisible ? t("winners.hideTable") : t("winners.viewTable")}</span><span aria-hidden="true" className={`text-lg transition-transform ${isVisible ? "rotate-180" : ""}`}>⌄</span>
    </button>
    {isVisible ? <div id="wc26-knockout-bracket" className="mt-4 overflow-x-auto pb-2">
      {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <div className="flex min-w-max gap-4">
        {bracketStages.map((stage) => <section key={stage} className="w-64 shrink-0 rounded-3xl bg-slate-50 p-3">
          <h3 className="mb-3 text-center text-sm font-black text-slate-700">{stageLabel(stage)}</h3>
          <div className="space-y-3">{(fixturesByStage.get(stage) ?? []).map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} />)}</div>
          {data && !(fixturesByStage.get(stage) ?? []).length ? <p className="rounded-2xl border border-dashed border-slate-300 p-3 text-center text-xs font-bold text-slate-500">Awaiting synced fixtures</p> : null}
        </section>)}
      </div>
    </div> : null}
  </Card>;
}
