import type { PlatformView } from "@/services/platform/views";
import type { leagueSeasonView } from "@/services/platform/views";
export type Serialized<T> = T extends Date ? string : T extends Array<infer U> ? Serialized<U>[] : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
export type ClientPlatformView = Serialized<NonNullable<PlatformView>>;
export type ClientLeagueView = Serialized<Awaited<ReturnType<typeof leagueSeasonView>>>;
export async function platformAction(body: unknown) {
  const response = await fetch("/api/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data.result;
}
