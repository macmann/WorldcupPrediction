import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LockIcon } from "@/components/Icons";
import { PredictionForm } from "@/components/PredictionForm";
import { matchLabel, type Match } from "@/lib/frontendData";
import { fetchMatches } from "@/lib/serverMatches";

type MatchCenterProps = {
  searchParams?: {
    group?: string;
  };
};

function groupSortValue(groupName: string) {
  return groupName.length === 1 ? groupName.charCodeAt(0) : Number.MAX_SAFE_INTEGER;
}

function groupTabs(matches: Match[]) {
  return Array.from(new Set(matches.filter((match) => match.stage === "GROUP" && match.groupName).map((match) => match.groupName as string)))
    .sort((a, b) => groupSortValue(a) - groupSortValue(b) || a.localeCompare(b));
}

export default async function MatchCenter({ searchParams }: MatchCenterProps) {
  const allMatches = await fetchMatches();
  const groups = groupTabs(allMatches);
  const selectedGroup = searchParams?.group && groups.includes(searchParams.group) ? searchParams.group : groups[0];
  const matches = selectedGroup ? allMatches.filter((match) => match.stage !== "GROUP" || match.groupName === selectedGroup) : allMatches;
  const now = new Date();

  return (
    <AppShell title="Match Center" eyebrow="Predictor">
      <SectionTitle eyebrow="Fixtures" title="Make your picks" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {groups.length ? groups.map((group) => {
          const isActive = group === selectedGroup;
          return (
            <Link key={group} href={`/predict?group=${encodeURIComponent(group)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
              Group {group}
            </Link>
          );
        }) : <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">Fixtures syncing…</span>}
      </div>
      <div className="space-y-3">
        {matches.length ? matches.map((match) => {
          const locked = match.isLocked || now >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
          return (
            <Card key={match.id} className={locked ? "opacity-80" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{matchLabel(match)}</p>
                  <h3 className="text-lg font-black">{match.homeTeam} vs {match.awayTeam}</h3>
                  <p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p>
                </div>
                {locked && <span className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold"><LockIcon className="h-3 w-3" /> Locked</span>}
              </div>
              <PredictionForm match={match} serverNowIso={now.toISOString()} />
            </Card>
          );
        }) : (
          <Card><p className="text-sm font-semibold text-slate-500">No World Cup fixtures are available yet. Check your football API configuration and run fixture sync.</p></Card>
        )}
      </div>
    </AppShell>
  );
}
