import { appDateKey } from "@/lib/dateTime";
import type { Match } from "@/lib/frontendData";

export function matchDateKey(kickoffTime: string | Date) {
  return appDateKey(kickoffTime);
}

export function dateTabs(matches: Pick<Match, "kickoffTime">[], now: Date) {
  return Array.from(new Set([matchDateKey(now), ...matches.map((match) => matchDateKey(match.kickoffTime))])).sort();
}

export function defaultDateTab(now: Date) {
  return matchDateKey(now);
}

export function selectedDateTab(dates: string[], requestedDate: string | undefined, requestedGroup: string | undefined, now: Date) {
  if (requestedDate && dates.includes(requestedDate)) return requestedDate;
  return requestedGroup ? undefined : defaultDateTab(now);
}
