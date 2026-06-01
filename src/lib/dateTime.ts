export const APP_TIME_ZONE = "Asia/Yangon";
export const APP_TIME_ZONE_LABEL = "MMT";
const MMT_OFFSET_MINUTES = 6 * 60 + 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

function datePartsInAppTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

export function appDateKey(date: string | Date) {
  const parts = datePartsInAppTimeZone(new Date(date));
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function addAppDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));
  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDate.getUTCDate()).padStart(2, "0")}`;
}

export function appDayRange(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - MMT_OFFSET_MINUTES * MS_PER_MINUTE);
  return { start, end: new Date(start.getTime() + MS_PER_DAY) };
}

export function formatAppDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en", { timeZone: APP_TIME_ZONE, ...options }).format(new Date(date));
}

export function formatAppDateTime(date: string | Date) {
  return `${formatAppDate(date, { dateStyle: "medium", timeStyle: "short" })} ${APP_TIME_ZONE_LABEL}`;
}
