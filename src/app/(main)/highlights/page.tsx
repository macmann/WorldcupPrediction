import { AppShell } from "@/components/AppShell";
import { Card, SectionTitle } from "@/components/Cards";
import { TeamName } from "@/components/TeamName";
import { formatAppDateTime } from "@/lib/dateTime";
import { fetchMatches } from "@/lib/serverMatches";
import { googleDrivePreviewUrl } from "@/lib/googleDrive";

export default async function HighlightsPage() {
  const matches = await fetchMatches();
  const highlightMatches = matches
    .filter((match) => match.status === "FINISHED" && match.highlightUrl)
    .sort((first, second) => new Date(second.kickoffTime).getTime() - new Date(first.kickoffTime).getTime());

  return (
    <AppShell>
      <Card className="bg-gradient-to-br from-slate-950 via-navy to-emerald-700 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-100/80">Watch daily highlights</p>
        <h1 className="mt-2 text-3xl font-black">Relive completed matches</h1>
        <p className="mt-2 text-sm font-semibold text-emerald-50/90">Tap any completed score below and watch the official Google Drive highlight without leaving the app.</p>
      </Card>

      <Card>
        <SectionTitle eyebrow="Completed matches" title="Available highlights" />
        {highlightMatches.length > 0 ? (
          <div className="mt-4 space-y-4">
            {highlightMatches.map((match) => {
              const homeScore = match.homeScore90 ?? match.homeScore ?? "–";
              const awayScore = match.awayScore90 ?? match.awayScore ?? "–";
              const embedUrl = match.highlightUrl ? googleDrivePreviewUrl(match.highlightUrl) : null;
              if (!embedUrl) return null;
              return (
                <details key={match.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 open:bg-white open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-700">{formatAppDateTime(match.kickoffTime)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-base font-black text-slate-950">
                        <TeamName name={match.homeTeam} flagEmoji={match.homeFlagEmoji} flagImageUrl={match.homeFlagImageUrl} />
                        <span className="rounded-full bg-navy px-3 py-1 text-sm text-white">{homeScore} - {awayScore}</span>
                        <TeamName name={match.awayTeam} flagEmoji={match.awayFlagEmoji} flagImageUrl={match.awayFlagImageUrl} />
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-600 px-3 py-2 text-xs font-black text-white">Watch ▶</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950">
                      <iframe className="h-full w-full" src={embedUrl} title={`${match.homeTeam} vs ${match.awayTeam} highlights`} allow="autoplay" allowFullScreen />
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-500">Highlights will appear here after completed matches have Google Drive links added by the admin team.</p>
        )}
      </Card>
    </AppShell>
  );
}
