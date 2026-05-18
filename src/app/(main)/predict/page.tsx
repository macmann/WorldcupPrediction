import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LockIcon } from "@/components/Icons";
import { TeamName } from "@/components/TeamName";
import { PredictionForm } from "@/components/PredictionForm";
import { matchLabel, type Match } from "@/lib/frontendData";
import { fetchMatches, fetchStreams } from "@/lib/serverMatches";

type MatchCenterProps = {
  searchParams?: {
    date?: string;
    group?: string;
    stream?: string;
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

function defaultDateTab(dates: string[], now: Date) {
  if (!dates.length) return undefined;

  const today = dateKey(now);

  if (dates.includes(today)) return today;

  return dates.find((tabDate) => tabDate > today) ?? dates[dates.length - 1];
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
  const streams = await fetchStreams();
  const requestedStream = searchParams?.stream && streams.some((stream) => stream.id === searchParams.stream) ? searchParams.stream : undefined;
  const allMatches = await fetchMatches(requestedStream ? { tournamentId: requestedStream } : {});
  const groups = groupTabs(allMatches);
  const dates = dateTabs(allMatches);
  const now = new Date();
  const requestedDate = searchParams?.date && dates.includes(searchParams.date) ? searchParams.date : undefined;
  const requestedGroup = searchParams?.group && groups.includes(searchParams.group) ? searchParams.group : undefined;
  const selectedDate = requestedDate ?? (requestedGroup ? undefined : defaultDateTab(dates, now));
  const selectedGroup = !selectedDate ? requestedGroup ?? groups[0] : undefined;
  const selectedStream = requestedStream ? streams.find((stream) => stream.id === requestedStream) : undefined;
  const streamParam = requestedStream ? `&stream=${encodeURIComponent(requestedStream)}` : "";
  const matches = selectedDate
    ? allMatches.filter((match) => dateKey(match.kickoffTime) === selectedDate)
    : selectedGroup
      ? allMatches.filter((match) => match.stage !== "GROUP" || match.groupName === selectedGroup)
      : allMatches;
  const selectedDateLabel = selectedDate ? dateTabLabel(selectedDate, now) : undefined;

  return (
    <AppShell title="Match Center" eyebrow="Predictor">
      <SectionTitle eyebrow="Fixtures" title="Make your picks" />
      <details className="rounded-3xl bg-white/80 p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-navy [&::-webkit-details-marker]:hidden">
          <span>Filters</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {selectedStream ? selectedStream.name : selectedDateLabel ? `Showing ${selectedDateLabel}` : selectedGroup ? `Showing Group ${selectedGroup}` : "All fixtures"}
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Competition stream</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <Link href="/predict" className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${!selectedStream ? "bg-navy text-white" : "bg-white text-slate-700"}`}>All streams</Link>
              {streams.map((stream) => (
                <Link key={stream.id} href={`/predict?stream=${encodeURIComponent(stream.id)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${stream.id === selectedStream?.id ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                  {stream.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">By date</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {dates.length ? (
                dates.map((tabDate) => {
                  const isActive = tabDate === selectedDate;
                  const dailyMatches = allMatches.filter((match) => dateKey(match.kickoffTime) === tabDate).length;

                  return (
                    <Link key={tabDate} href={`/predict?date=${encodeURIComponent(tabDate)}${streamParam}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
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
                    <Link key={group} href={`/predict?group=${encodeURIComponent(group)}${streamParam}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
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
      </details>
      <div className="space-y-3">
        {matches.length ? matches.map((match) => {
          const locked = match.isLocked || now >= new Date(match.kickoffTime) || match.status !== "SCHEDULED";
          return (
            <Card key={match.id} className={locked ? "opacity-80" : ""}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{matchLabel(match)}</p>
                    <h3 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-black">
                      <TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} />
                      <span className="text-slate-400">vs</span>
                      <TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} />
                    </h3>
                    <p className="text-xs text-slate-500">{new Date(match.kickoffTime).toUTCString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {locked && <span className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold"><LockIcon className="h-3 w-3" /> Locked</span>}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 group-open:bg-emerald-100 group-open:text-emerald-700">Tap to pick</span>
                  </div>
                </summary>
                <PredictionForm match={match} serverNowIso={now.toISOString()} />
              </details>
            </Card>
          );
        }) : (
          <Card><p className="text-sm font-semibold text-slate-500">No fixtures are available for this stream yet. Check your football API configuration, add matches, or run fixture sync.</p></Card>
        )}
      </div>
    </AppShell>
  );
}
