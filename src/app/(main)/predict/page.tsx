import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LockIcon } from "@/components/Icons";
import { PredictionForm } from "@/components/PredictionForm";
import { matchLabel, type Match } from "@/lib/frontendData";
import { fetchMatches } from "@/lib/serverMatches";

type MatchCenterProps = {
  searchParams?: {
    date?: string;
    group?: string;
  };
};

function groupSortValue(groupName: string) {
  return groupName.length === 1 ? groupName.charCodeAt(0) : Number.MAX_SAFE_INTEGER;
}

function groupTabs(matches: Match[]) {
  return Array.from(
    new Set(matches.filter((match) => match.stage === "GROUP" && match.groupName).map((match) => match.groupName as string))
  ).sort((a, b) => groupSortValue(a) - groupSortValue(b) || a.localeCompare(b));
}

function dateKey(kickoffTime: string | Date) {
  return new Date(kickoffTime).toISOString().slice(0, 10);
}

function dateTabs(matches: Match[]) {
  return Array.from(new Set(matches.map((match) => dateKey(match.kickoffTime)))).sort();
}

function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function dateTabLabel(tabDate: string, now: Date) {
  if (tabDate === dateKey(now)) return "Today";
  if (tabDate === dateKey(addUtcDays(now, 1))) return "Tomorrow";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short"
  }).format(new Date(`${tabDate}T00:00:00.000Z`));
}

export default async function MatchCenter({ searchParams }: MatchCenterProps) {
  const allMatches = await fetchMatches();
  const groups = groupTabs(allMatches);
  const dates = dateTabs(allMatches);
  const selectedDate = searchParams?.date && dates.includes(searchParams.date) ? searchParams.date : undefined;
  const selectedGroup = !selectedDate
    ? searchParams?.group && groups.includes(searchParams.group)
      ? searchParams.group
      : groups[0]
    : undefined;
  const matches = selectedDate
    ? allMatches.filter((match) => dateKey(match.kickoffTime) === selectedDate)
    : selectedGroup
      ? allMatches.filter((match) => match.stage !== "GROUP" || match.groupName === selectedGroup)
      : allMatches;
  const now = new Date();

  return (
    <AppShell title="Match Center" eyebrow="Predictor">
      <SectionTitle eyebrow="Fixtures" title="Make your picks" />
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">By date</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dates.length ? (
              dates.map((tabDate) => {
                const isActive = tabDate === selectedDate;
                const dailyMatches = allMatches.filter((match) => dateKey(match.kickoffTime) === tabDate).length;

                return (
                  <Link key={tabDate} href={`/predict?date=${encodeURIComponent(tabDate)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                    {dateTabLabel(tabDate, now)} <span className={isActive ? "text-white/70" : "text-slate-400"}>({dailyMatches})</span>
                  </Link>
                );
              })
            ) : (
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">Fixtures syncing…</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">By group</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {groups.length ? (
              groups.map((group) => {
                const isActive = group === selectedGroup;

                return (
                  <Link key={group} href={`/predict?group=${encodeURIComponent(group)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                    Group {group}
                  </Link>
                );
              })
            ) : (
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">Fixtures syncing…</span>
            )}
          </div>
        </div>
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
