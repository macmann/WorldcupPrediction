import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { LockIcon } from "@/components/Icons";
import { TeamName } from "@/components/TeamName";
import { PredictionForm } from "@/components/PredictionForm";
import { addAppDays, formatAppDateTime, formatAppDate } from "@/lib/dateTime";
import { dateTabs, defaultDateTab, matchDateKey } from "@/lib/predictTabs";
import { matchLabel, type Match } from "@/lib/frontendData";
import { fetchMatches, fetchStreams } from "@/lib/serverMatches";
import { getServerTranslator } from "@/lib/serverI18n";

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

function dateTabLabel(tabDate: string, now: Date, t: Awaited<ReturnType<typeof getServerTranslator>>) {
  const today = matchDateKey(now);
  if (tabDate === today) return t("predict.today");
  if (tabDate === addAppDays(today, 1)) return t("predict.tomorrow");

  return formatAppDate(`${tabDate}T00:00:00.000Z`, {
    day: "numeric",
    month: "short",
    weekday: "short"
  });
}

export default async function MatchCenter({ searchParams }: MatchCenterProps) {
  const t = await getServerTranslator();
  const streams = await fetchStreams();
  const requestedStream = searchParams?.stream && streams.some((stream) => stream.id === searchParams.stream) ? searchParams.stream : undefined;
  const allMatches = await fetchMatches(requestedStream ? { tournamentId: requestedStream } : {});
  const groups = groupTabs(allMatches);
  const now = new Date();
  const dates = dateTabs(allMatches, now);
  const requestedDate = searchParams?.date && dates.includes(searchParams.date) ? searchParams.date : undefined;
  const requestedGroup = searchParams?.group && groups.includes(searchParams.group) ? searchParams.group : undefined;
  const selectedDate = requestedDate ?? (requestedGroup ? undefined : defaultDateTab(now));
  const selectedGroup = !selectedDate ? requestedGroup ?? groups[0] : undefined;
  const selectedStream = requestedStream ? streams.find((stream) => stream.id === requestedStream) : undefined;
  const streamParam = requestedStream ? `&stream=${encodeURIComponent(requestedStream)}` : "";
  const matches = selectedDate
    ? allMatches.filter((match) => matchDateKey(match.kickoffTime) === selectedDate)
    : selectedGroup
      ? allMatches.filter((match) => match.stage !== "GROUP" || match.groupName === selectedGroup)
      : allMatches;
  const selectedDateLabel = selectedDate ? dateTabLabel(selectedDate, now, t) : undefined;

  return (
    <AppShell title={t("predict.title")} eyebrow={t("predict.eyebrow")}>
      <SectionTitle eyebrow={t("predict.fixtures")} title={t("predict.makePicks")} />
      <details className="rounded-3xl bg-white/80 p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-navy [&::-webkit-details-marker]:hidden">
          <span>{t("predict.filters")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {selectedStream ? selectedStream.name : selectedDateLabel ? `${t("predict.showing")} ${selectedDateLabel}` : selectedGroup ? `${t("predict.showingGroup")} ${selectedGroup}` : t("predict.allFixtures")}
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{t("predict.competitionStream")}</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <Link href="/predict" className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${!selectedStream ? "bg-navy text-white" : "bg-white text-slate-700"}`}>{t("predict.allStreams")}</Link>
              {streams.map((stream) => (
                <Link key={stream.id} href={`/predict?stream=${encodeURIComponent(stream.id)}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${stream.id === selectedStream?.id ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                  {stream.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{t("predict.byDate")}</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {dates.length ? (
                dates.map((tabDate) => {
                  const isActive = tabDate === selectedDate;
                  const dailyMatches = allMatches.filter((match) => matchDateKey(match.kickoffTime) === tabDate).length;

                  return (
                    <Link key={tabDate} href={`/predict?date=${encodeURIComponent(tabDate)}${streamParam}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                      {dateTabLabel(tabDate, now, t)} <span className={isActive ? "text-white/70" : "text-slate-400"}>({dailyMatches})</span>
                    </Link>
                  );
                })
              ) : (
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">{t("predict.fixturesSyncing")}</span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">{t("predict.byGroup")}</p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {groups.length ? (
                groups.map((group) => {
                  const isActive = group === selectedGroup;

                  return (
                    <Link key={group} href={`/predict?group=${encodeURIComponent(group)}${streamParam}`} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}>
                      {t("predict.group")} {group}
                    </Link>
                  );
                })
              ) : (
                <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">{t("predict.fixturesSyncing")}</span>
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
                      <span className="text-slate-400">{t("common.vs")}</span>
                      <TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} />
                    </h3>
                    <p className="text-xs text-slate-500">{formatAppDateTime(match.kickoffTime)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {locked && <span className="flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold"><LockIcon className="h-3 w-3" /> {t("predict.locked")}</span>}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 group-open:bg-emerald-100 group-open:text-emerald-700">{t("predict.tapToPick")}</span>
                  </div>
                </summary>
                <PredictionForm match={match} serverNowIso={now.toISOString()} />
              </details>
            </Card>
          );
        }) : (
          <Card><p className="text-sm font-semibold text-slate-500">{t("predict.noFixtures")}</p></Card>
        )}
      </div>
    </AppShell>
  );
}
