import { cookies, headers } from "next/headers";
import type { Match, MatchFilters } from "@/lib/frontendData";

function appBaseUrl() {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function sessionCookieHeader() {
  return cookies()
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function fetchMatches(filters: MatchFilters = {}): Promise<Match[]> {
  const url = new URL("/api/matches", appBaseUrl());
  if (filters.group) url.searchParams.set("group", filters.group);
  if (filters.stage) url.searchParams.set("stage", filters.stage);
  if (filters.matchday) url.searchParams.set("matchday", String(filters.matchday));

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { cookie: sessionCookieHeader() }
    });
    if (!response.ok) throw new Error("Unable to load API matches");
    const data = await response.json();
    return data.matches ?? [];
  } catch {
    return [];
  }
}
