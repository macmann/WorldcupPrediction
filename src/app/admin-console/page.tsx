"use client";

import { useEffect, useState, useTransition } from "react";
import { PlatformLogo } from "@/components/Icons";

const panelClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const buttonClass = "rounded-xl px-4 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-70";
const maxAnnouncementImageBytes = 6 * 1024 * 1024;


type AdminSession = { id: string; username: string; displayName: string; isSuperAdmin: boolean };
type AdminAccount = { id: string; username: string; displayName: string; isSuperAdmin: boolean; createdAt: string };
type AdminUser = {
  id: string; email: string; displayName: string; avatarUrl?: string | null; globalPoints: number;
  exactScoresCount: number; correctOutcomesCount: number; isAdmin: boolean; isBanned: boolean; banReason?: string | null;
};
type AdminTournament = { id: string; name: string; slug: string; startsAt: string; endsAt?: string | null; isActive: boolean; externalId?: string | null };
type ApiCompetition = { code: string; name: string; externalId: string; areaName?: string | null; startsAt: string; endsAt?: string | null; isAdded: boolean };
type AdminAnnouncement = { id: string; title: string; description: string; imageUrl: string; linkUrl: string; isActive: boolean; displayFrequencyHours: number; createdAt: string; updatedAt: string };
type OpsPayload = {
  settings: { announcementText?: string | null; maintenanceMode: boolean; updatedAt: string };
  announcements: AdminAnnouncement[];
  syncStatus: {
    fixtureIngestion?: JobStatus | null;
    liveScorePoll?: JobStatus | null;
    latestSyncedMatch?: { id: number; homeTeam: string; awayTeam: string; lastSyncedAt?: string | null } | null;
  };
  analytics: { totalUsers: number; dailyActiveUsers: number; upcomingMatchdayPredictions: number; totalPredictions: number; utcWindowStart: string; utcWindowEnd: string };
  leagues: Array<{ id: string; name: string; joinCode: string; createdAt: string; memberCount: number }>;
  recentFinishedMatches: Array<{ id: number; homeTeam: string; awayTeam: string; homeScore90?: number | null; awayScore90?: number | null; homeScore?: number | null; awayScore?: number | null; kickoffTime: string; lastSyncedAt?: string | null }>;
  tournaments: AdminTournament[];
  settlements: Array<{ id: string; tournamentId: string; settledAt: string; goldenBallPlayer: { id: string; name: string }; goldenGlovePlayer: { id: string; name: string } }>;
};
type JobStatus = { key: string; label: string; lastRunAt?: string | null; lastSuccessAt?: string | null; lastError?: string | null; lastPayload?: unknown };
type AuditPayload = { user: { email: string; displayName: string; registrationTimestamp: string; isBanned: boolean; banReason?: string | null }; predictions: Array<{ id: string; matchId: number; predictedOutcome?: string | null; predictedHomeScore?: number | null; predictedAwayScore?: number | null; pointsAwarded?: number | null; isLocked: boolean; submittedAt: string; updatedAt: string; scoredAt?: string | null; match: { homeTeam: string; awayTeam: string; kickoffTime: string; status: string; homeScore90?: number | null; awayScore90?: number | null } }> };
type AdminTab = "overview" | "users" | "announcements" | "matches" | "tournaments" | "settings" | "admins";

async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = data.details?.fieldErrors ? Object.entries(data.details.fieldErrors).flatMap(([field, messages]) => Array.isArray(messages) ? messages.map((detail) => `${field}: ${detail}`) : []).join("; ") : "";
    throw new Error(details ? `${data.error ?? "Admin request failed"}: ${details}` : data.error ?? "Admin request failed");
  }
  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

export default function AdminConsole() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [streams, setStreams] = useState<AdminTournament[]>([]);
  const [apiCompetitions, setApiCompetitions] = useState<ApiCompetition[]>([]);
  const [ops, setOps] = useState<OpsPayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  function loadAdminData(search = query, currentAdmin = admin) {
    setError(null);
    startTransition(async () => {
      try {
        const [userData, streamData, adminData, opsData] = await Promise.all([
          adminJson<{ users: AdminUser[] }>(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`),
          adminJson<{ tournaments: AdminTournament[] }>("/api/admin/tournaments"),
          currentAdmin?.isSuperAdmin ? adminJson<{ admins: AdminAccount[] }>("/api/admin/admins") : Promise.resolve({ admins: [] }),
          adminJson<OpsPayload>("/api/admin/operations")
        ]);
        setUsers(userData.users);
        setStreams(streamData.tournaments);
        setAdmins(adminData.admins);
        setOps(opsData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load admin data");
      }
    });
  }

  useEffect(() => {
    let mounted = true;
    adminJson<{ admin: AdminSession }>("/api/admin/auth/me")
      .then((data) => { if (!mounted) return; setAdmin(data.admin); setAuthChecked(true); loadAdminData("", data.admin); })
      .catch(() => { if (!mounted) return; setAdmin(null); setAuthChecked(true); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(nextAdmin: AdminSession) { setAdmin(nextAdmin); setMessage(`Welcome, ${nextAdmin.displayName}.`); loadAdminData("", nextAdmin); }
  function logout() {
    setError(null);
    startTransition(async () => { try { await adminJson("/api/admin/auth/logout", { method: "POST" }); } finally { setAdmin(null); setAdmins([]); setUsers([]); setStreams([]); setOps(null); setMessage(null); } });
  }

  function updateUser(id: string, payload: Record<string, unknown>, success: string) {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setUsers((current) => current.map((user) => user.id === id ? data.user : user));
        setMessage(success);
      } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Could not update user"); }
    });
  }

  function createAdminAccount(formData: FormData) {
    const payload = { username: String(formData.get("username") ?? ""), displayName: String(formData.get("displayName") ?? ""), password: String(formData.get("password") ?? ""), isSuperAdmin: formData.get("isSuperAdmin") === "on" };
    setError(null); setMessage(null);
    startTransition(async () => { try { const data = await adminJson<{ admin: AdminAccount }>("/api/admin/admins", { method: "POST", body: JSON.stringify(payload) }); setAdmins((current) => [...current, data.admin]); setMessage(`Admin account ${data.admin.username} created.`); } catch (adminError) { setError(adminError instanceof Error ? adminError.message : "Could not create admin account"); } });
  }

  function createStream(formData: FormData) {
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");
    const payload = { name: String(formData.get("name") ?? ""), startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : null, hostCountries: String(formData.get("hostCountries") ?? "").split(",").map((country) => country.trim()).filter(Boolean), isActive: true };
    setError(null); setMessage(null);
    startTransition(async () => { try { const data = await adminJson<{ tournament: AdminTournament }>("/api/admin/tournaments", { method: "POST", body: JSON.stringify(payload) }); setStreams((current) => [data.tournament, ...current]); setMessage(`${data.tournament.name} stream is now visible to users.`); loadAdminData(); } catch (streamError) { setError(streamError instanceof Error ? streamError.message : "Could not create stream"); } });
  }

  function loadApiCompetitions() {
    setError(null); setMessage(null);
    startTransition(async () => { try { const data = await adminJson<{ competitions: ApiCompetition[] }>("/api/admin/tournaments/catalog"); setApiCompetitions(data.competitions); } catch (catalogError) { setError(catalogError instanceof Error ? catalogError.message : "Could not load API leagues"); } });
  }

  function importApiCompetition(code: string) {
    setError(null); setMessage(null);
    startTransition(async () => { try { const data = await adminJson<{ tournament: AdminTournament; sync: { upserted: number; queuedForScoring: number } }>("/api/admin/tournaments/import", { method: "POST", body: JSON.stringify({ code }) }); setMessage(`${data.tournament.name} added from API with ${data.sync.upserted} synced fixtures.`); await loadAdminData(); await loadApiCompetitions(); } catch (importError) { setError(importError instanceof Error ? importError.message : "Could not import API league"); } });
  }

  function overrideScore(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    const payload = { homeScore: Number(formData.get("homeScore")), awayScore: Number(formData.get("awayScore")) };
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson(`/api/admin/matches/${matchId}/override`, { method: "POST", body: JSON.stringify(payload) }); setMessage(`Match ${matchId} score overridden and queued for scoring.`); loadAdminData(); } catch (scoreError) { setError(scoreError instanceof Error ? scoreError.message : "Could not override score"); } });
  }

  function recalculate(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    setError(null); setMessage(null);
    startTransition(async () => { try { const result = await adminJson<{ scoredPredictions: number }>(`/api/admin/matches/${matchId}/recalculate`, { method: "POST" }); setMessage(`Match ${matchId} points recalculated for ${result.scoredPredictions} predictions.`); loadAdminData(); } catch (recalcError) { setError(recalcError instanceof Error ? recalcError.message : "Could not recalculate match"); } });
  }

  function saveSettings(formData: FormData) {
    const payload = { announcementText: String(formData.get("announcementText") ?? ""), maintenanceMode: formData.get("maintenanceMode") === "on" };
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson("/api/admin/settings", { method: "PATCH", body: JSON.stringify(payload) }); setMessage("Global settings updated."); loadAdminData(); } catch (settingsError) { setError(settingsError instanceof Error ? settingsError.message : "Could not save settings"); } });
  }

  async function createAnnouncement(formData: FormData) {
    const image = formData.get("image");
    setError(null); setMessage(null);
    if (!(image instanceof File) || image.size === 0) { setError("Announcement image is required."); return; }
    if (!image.type.startsWith("image/")) { setError("Please upload a valid image file for the announcement."); return; }
    if (image.size > maxAnnouncementImageBytes) { setError("Announcement image must be 6 MB or smaller."); return; }
    try {
      const payload = { title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? ""), linkUrl: String(formData.get("linkUrl") ?? ""), imageUrl: await fileToDataUrl(image), isActive: formData.get("isActive") === "on", displayFrequencyHours: Number(formData.get("displayFrequencyHours") ?? 24) };
      startTransition(async () => { try { const data = await adminJson<{ announcement: AdminAnnouncement }>("/api/admin/announcements", { method: "POST", body: JSON.stringify(payload) }); setOps((current) => current ? { ...current, announcements: [data.announcement, ...current.announcements] } : current); setMessage(`Announcement ${data.announcement.title} created.`); loadAdminData(); } catch (announcementError) { setError(announcementError instanceof Error ? announcementError.message : "Could not create announcement"); } });
    } catch (imageError) { setError(imageError instanceof Error ? imageError.message : "Could not read image file"); }
  }

  function updateAnnouncement(id: string, payload: Partial<AdminAnnouncement>, success: string) {
    setError(null); setMessage(null);
    startTransition(async () => { try { const data = await adminJson<{ announcement: AdminAnnouncement }>(`/api/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); setOps((current) => current ? { ...current, announcements: current.announcements.map((announcement) => announcement.id === id ? data.announcement : announcement) } : current); setMessage(success); } catch (announcementError) { setError(announcementError instanceof Error ? announcementError.message : "Could not update announcement"); } });
  }

  function deleteAnnouncement(id: string) {
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson(`/api/admin/announcements/${id}`, { method: "DELETE" }); setOps((current) => current ? { ...current, announcements: current.announcements.filter((announcement) => announcement.id !== id) } : current); setMessage("Announcement deleted."); } catch (announcementError) { setError(announcementError instanceof Error ? announcementError.message : "Could not delete announcement"); } });
  }

  function settleOutrights(formData: FormData) {
    const payload = { tournamentId: String(formData.get("tournamentId") ?? ""), goldenBallPlayerId: String(formData.get("goldenBallPlayerId") ?? ""), goldenGlovePlayerId: String(formData.get("goldenGlovePlayerId") ?? "") };
    setError(null); setMessage(null);
    startTransition(async () => { try { const result = await adminJson<{ scoredOutrights: number; awardedUsers: number }>("/api/admin/outrights/settle", { method: "POST", body: JSON.stringify(payload) }); setMessage(`Outrights settled for ${result.scoredOutrights} entries; ${result.awardedUsers} users received awards.`); loadAdminData(); } catch (settleError) { setError(settleError instanceof Error ? settleError.message : "Could not settle outrights"); } });
  }

  function deleteLeague(id: string) {
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson(`/api/admin/leagues/${id}`, { method: "DELETE" }); setMessage("Private league deleted."); loadAdminData(); } catch (leagueError) { setError(leagueError instanceof Error ? leagueError.message : "Could not delete league"); } });
  }

  function loadAudit(id: string) {
    setError(null);
    startTransition(async () => { try { setAudit(await adminJson<AuditPayload>(`/api/admin/users/${id}/audit`)); } catch (auditError) { setError(auditError instanceof Error ? auditError.message : "Could not load audit trail"); } });
  }

  if (!authChecked) return <main className="min-h-dvh bg-slate-950 p-8 text-white">Checking admin access…</main>;
  if (!admin) return <AdminLogin onLogin={handleLogin} />;

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="border-b border-white/10 bg-navy px-8 py-6 text-white shadow-xl shadow-slate-900/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><PlatformLogo className="h-12 w-12" /></span><div><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Desktop Admin</p><h1 className="mt-1 text-3xl font-black tracking-tight">Operations Console</h1><p className="mt-1 text-sm font-semibold text-white/70">Signed in as {admin.displayName} ({admin.username})</p></div></div>
          <button type="button" onClick={logout} disabled={isPending} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60">Log out</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Registered users" value={ops?.analytics.totalUsers ?? users.length} />
          <MetricCard label="Daily active users" value={ops?.analytics.dailyActiveUsers ?? 0} />
          <MetricCard label="Upcoming predictions" value={ops?.analytics.upcomingMatchdayPredictions ?? 0} />
          <MetricCard label="Restricted accounts" value={users.filter((user) => user.isBanned).length} tone="red" />
        </section>
        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <AdminTabs activeTab={activeTab} isSuperAdmin={admin.isSuperAdmin} onChange={setActiveTab} />

        <section className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <div className={panelClass}>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Operations overview</p><h2 className="mt-1 text-2xl font-black text-navy">API sync status dashboard</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <StatusCard title="Fixture ingestion" status={ops?.syncStatus.fixtureIngestion} />
                  <StatusCard title="Live score poll" status={ops?.syncStatus.liveScorePoll} />
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Latest match sync</p><p className="mt-2 font-black text-navy">{formatDate(ops?.syncStatus.latestSyncedMatch?.lastSyncedAt)}</p><p className="text-xs font-semibold text-slate-500">{ops?.syncStatus.latestSyncedMatch ? `#${ops.syncStatus.latestSyncedMatch.id} ${ops.syncStatus.latestSyncedMatch.homeTeam} vs ${ops.syncStatus.latestSyncedMatch.awayTeam}` : "No synced fixture yet"}</p></div>
                </div>
              </div>

              <div className={panelClass}>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Platform Analytics</p><h2 className="mt-1 text-2xl font-black text-navy">Private leagues</h2>
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">{ops?.leagues.map((league) => <div key={league.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div><p className="font-black text-navy">{league.name}</p><p className="text-xs font-bold text-slate-500">{league.joinCode} · {league.memberCount} members</p></div><button type="button" disabled={isPending} onClick={() => deleteLeague(league.id)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Delete</button></div>)}</div>
              </div>
            </div>
          )}

          {activeTab === "matches" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Matches & Operations</p><h2 className="mt-1 text-2xl font-black text-navy">Scores and recalculation tools</h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <form action={overrideScore} className="rounded-2xl border border-red-100 bg-red-50 p-4"><h3 className="font-black text-red-700">Manual result overwrite</h3><p className="mt-1 text-xs font-semibold text-red-600/80">Inputs final 90-minute score and forces FINISHED.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_90px_90px]"><input name="matchId" className={inputClass} placeholder="Match ID" type="number" required /><input name="homeScore" className={inputClass} placeholder="Home" type="number" min="0" required /><input name="awayScore" className={inputClass} placeholder="Away" type="number" min="0" required /></div><button disabled={isPending} className={`${buttonClass} mt-3 w-full bg-red-600`}>Override final score</button></form>
                <form action={recalculate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-navy">Point recalculation trigger</h3><p className="mt-1 text-xs font-semibold text-slate-500">Wipes prior awards for this match and rebuilds global/private leaderboard totals.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><input name="matchId" className={inputClass} placeholder="Match ID" type="number" required /><button disabled={isPending} className={`${buttonClass} bg-slate-800`}>Recalculate points</button></div></form>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Moderation & User Management</p><h2 className="mt-1 text-2xl font-black text-navy">Accounts, audit logs, points & bans</h2>
              <form action={() => loadAdminData(query)} className="mt-5 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search user by email or display name" /><button disabled={isPending} className={`${buttonClass} bg-navy`}>Search</button></form>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400"><th className="py-3 pr-4">User</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Exact</th><th className="px-4 py-3">Outcomes</th><th className="px-4 py-3">Status</th><th className="py-3 pl-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <UserRow key={user.id} user={user} disabled={isPending} onUpdate={updateUser} onAudit={loadAudit} />)}</tbody></table></div>
              {audit && <AuditPanel audit={audit} />}
            </div>
          )}

          {activeTab === "announcements" && <AnnouncementAdminPanel announcements={ops?.announcements ?? []} disabled={isPending} onCreate={createAnnouncement} onUpdate={updateAnnouncement} onDelete={deleteAnnouncement} />}

          {activeTab === "settings" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Global Settings</p><h2 className="mt-1 text-2xl font-black text-navy">Site controls</h2>
              <form action={saveSettings} className="mt-5 space-y-3"><textarea name="announcementText" defaultValue={ops?.settings.announcementText ?? ""} className={`${inputClass} min-h-28`} placeholder="⚠️ Notice: Group stage predictions lock in 2 hours!" /><label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700"><input name="maintenanceMode" type="checkbox" defaultChecked={ops?.settings.maintenanceMode ?? false} className="h-5 w-5 rounded border-slate-300" />Maintenance mode</label><button disabled={isPending} className={`${buttonClass} w-full bg-amber-600`}>Publish settings</button></form>
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <div className={panelClass}>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tournament outrights</p><h2 className="mt-1 text-2xl font-black text-navy">Golden Ball / Glove settlement</h2>
                <form action={settleOutrights} className="mt-5 space-y-3"><select name="tournamentId" required className={inputClass}>{(ops?.tournaments ?? streams).map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select><input name="goldenBallPlayerId" required className={inputClass} placeholder="Golden Ball player UUID" /><input name="goldenGlovePlayerId" required className={inputClass} placeholder="Golden Glove player UUID" /><button disabled={isPending} className={`${buttonClass} w-full bg-emerald-600`}>Settle final awards</button></form>
                <div className="mt-4 space-y-2">{ops?.settlements.map((settlement) => <div key={settlement.id} className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{formatDate(settlement.settledAt)} · Ball: {settlement.goldenBallPlayer.name} · Glove: {settlement.goldenGlovePlayer.name}</div>)}</div>
              </div>
              <StreamPanel streams={streams} competitions={apiCompetitions} disabled={isPending} onCreate={createStream} onLoadCompetitions={loadApiCompetitions} onImportCompetition={importApiCompetition} />
            </div>
          )}

          {activeTab === "admins" && admin.isSuperAdmin && <AdminAccountPanel admins={admins} disabled={isPending} onCreate={createAdminAccount} />}
        </section>
      </div>
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: (admin: AdminSession) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function login(formData: FormData) { setError(null); startTransition(async () => { try { const data = await adminJson<{ admin: AdminSession }>("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ username: String(formData.get("username") ?? ""), password: String(formData.get("password") ?? "") }) }); onLogin(data.admin); } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Could not sign in"); } }); }
  return <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-2xl"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white"><PlatformLogo className="h-12 w-12" /></span><div><p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Admin only</p><h1 className="text-3xl font-black text-navy">Admin Console</h1></div></div><p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Use the separate admin username and password. Player accounts cannot sign in here.</p>{error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<form action={login} className="mt-6 space-y-4"><input name="username" className={inputClass} autoComplete="username" placeholder="Admin username" required /><input name="password" className={inputClass} autoComplete="current-password" placeholder="Admin password" type="password" required /><button disabled={isPending} className={`${buttonClass} w-full bg-navy`}>{isPending ? "Signing in…" : "Sign in to admin"}</button></form></section></main>;
}

function AdminTabs({ activeTab, isSuperAdmin, onChange }: { activeTab: AdminTab; isSuperAdmin: boolean; onChange: (tab: AdminTab) => void }) {
  const tabs: Array<{ id: AdminTab; label: string; description: string }> = [
    { id: "overview", label: "Overview", description: "Health and leagues" },
    { id: "users", label: "Users", description: "Moderation" },
    { id: "announcements", label: "Popups", description: "Ads and notices" },
    { id: "matches", label: "Matches", description: "Scores and points" },
    { id: "tournaments", label: "Tournaments", description: "Streams and awards" },
    { id: "settings", label: "Settings", description: "Site controls" }
  ];
  if (isSuperAdmin) tabs.push({ id: "admins", label: "Admins", description: "Access control" });

  return (
    <nav aria-label="Admin sections" className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-2xl px-4 py-3 text-left transition ${isActive ? "bg-navy text-white shadow-lg shadow-slate-900/10" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="block text-sm font-black">{tab.label}</span>
              <span className={`mt-1 block text-[11px] font-bold ${isActive ? "text-white/70" : "text-slate-400"}`}>{tab.description}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MetricCard({ label, value, tone = "navy" }: { label: string; value: number; tone?: "navy" | "red" }) { return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{label}</p><p className={`mt-3 text-4xl font-black ${tone === "red" ? "text-red-600" : "text-navy"}`}>{value}</p></div>; }
function StatusCard({ title, status }: { title: string; status?: JobStatus | null }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">{title}</p><p className={`mt-2 font-black ${status?.lastError ? "text-red-600" : "text-emerald-700"}`}>{status?.lastError ? "Needs attention" : status?.lastSuccessAt ? "Healthy" : "No run yet"}</p><p className="text-xs font-semibold text-slate-500">Success: {formatDate(status?.lastSuccessAt)}</p>{status?.lastError && <p className="mt-1 text-xs font-bold text-red-600">{status.lastError}</p>}</div>; }

function UserRow({ user, disabled, onUpdate, onAudit }: { user: AdminUser; disabled: boolean; onUpdate: (id: string, payload: Record<string, unknown>, success: string) => void; onAudit: (id: string) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName); const [email, setEmail] = useState(user.email); const [globalPoints, setGlobalPoints] = useState(String(user.globalPoints)); const [exactScoresCount, setExactScoresCount] = useState(String(user.exactScoresCount)); const [correctOutcomesCount, setCorrectOutcomesCount] = useState(String(user.correctOutcomesCount)); const [banReason, setBanReason] = useState(user.banReason ?? ""); const [password, setPassword] = useState("");
  return <tr className="align-top"><td className="py-4 pr-4"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} placeholder="Display name" /><input value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} placeholder="Email" />{user.isAdmin && <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Legacy admin</span>}</td><td className="px-4 py-4"><input value={globalPoints} onChange={(event) => setGlobalPoints(event.target.value)} className={inputClass} type="number" /></td><td className="px-4 py-4"><input value={exactScoresCount} onChange={(event) => setExactScoresCount(event.target.value)} className={inputClass} type="number" min="0" /></td><td className="px-4 py-4"><input value={correctOutcomesCount} onChange={(event) => setCorrectOutcomesCount(event.target.value)} className={inputClass} type="number" min="0" /></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{user.isBanned ? "Banned" : "Active"}</span><textarea value={banReason} onChange={(event) => setBanReason(event.target.value)} className={`${inputClass} mt-3 min-h-20`} placeholder="Ban reason" /></td><td className="py-4 pl-4"><div className="grid min-w-[260px] gap-2"><button type="button" disabled={disabled} onClick={() => onUpdate(user.id, { displayName, email, globalPoints: Number(globalPoints), exactScoresCount: Number(exactScoresCount), correctOutcomesCount: Number(correctOutcomesCount) }, "User details and manual points updated.")} className={`${buttonClass} bg-indigo-600`}>Save details & points</button><button type="button" disabled={disabled} onClick={() => onUpdate(user.id, { isBanned: !user.isBanned, banReason: user.isBanned ? null : banReason }, user.isBanned ? "User restriction removed." : "User restricted from leaderboards.")} className={`${buttonClass} ${user.isBanned ? "bg-emerald-600" : "bg-red-600"}`}>{user.isBanned ? "Unban user" : "Ban / flag user"}</button><button type="button" disabled={disabled} onClick={() => onAudit(user.id)} className={`${buttonClass} bg-slate-700`}>View audit trail</button><input value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="New password" type="password" /><button type="button" disabled={disabled || password.length < 8} onClick={() => { onUpdate(user.id, { password }, "Password reset."); setPassword(""); }} className={`${buttonClass} bg-slate-800`}>Reset password</button></div></td></tr>;
}

function AuditPanel({ audit }: { audit: AuditPayload }) { return <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-navy">Audit trail: {audit.user.displayName} ({audit.user.email})</h3><p className="mt-1 text-xs font-semibold text-slate-500">Registered {formatDate(audit.user.registrationTimestamp)} · {audit.predictions.length} recent predictions</p><div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">{audit.predictions.map((prediction) => <div key={prediction.id} className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-600"><p className="font-black text-slate-900">#{prediction.matchId} {prediction.match.homeTeam} vs {prediction.match.awayTeam} · kickoff {formatDate(prediction.match.kickoffTime)}</p><p>Pick: {prediction.predictedHomeScore ?? "—"}-{prediction.predictedAwayScore ?? "—"} ({prediction.predictedOutcome ?? "outcome not set"}) · Points {prediction.pointsAwarded ?? "pending"} · Locked {prediction.isLocked ? "yes" : "no"}</p><p>Created {formatDate(prediction.submittedAt)} · Updated {formatDate(prediction.updatedAt)} · Scored {formatDate(prediction.scoredAt)}</p></div>)}</div></div>; }


function AnnouncementAdminPanel({ announcements, disabled, onCreate, onUpdate, onDelete }: { announcements: AdminAnnouncement[]; disabled: boolean; onCreate: (formData: FormData) => void; onUpdate: (id: string, payload: Partial<AdminAnnouncement>, success: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={panelClass}>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Pop-up announcements & ads</p>
      <h2 className="mt-1 text-2xl font-black text-navy">Dashboard popups</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">Active items are shown randomly to users when they log in or first reach the dashboard. Each popup uses its own frequency setting to decide when it can reappear after a user closes it. The See more button uses the configured link.</p>
      <form action={onCreate} className="mt-5 space-y-3">
        <input name="title" required maxLength={120} className={inputClass} placeholder="Announcement title" />
        <input name="linkUrl" required className={inputClass} placeholder="See more link, e.g. /winners or https://sponsor.com" />
        <input name="image" required type="file" accept="image/*" className={inputClass} />
        <textarea name="description" required maxLength={1200} className={`${inputClass} min-h-28`} placeholder="Description shown below the image" />
        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Popup frequency
          <input name="displayFrequencyHours" type="number" min={1} max={8760} step={1} defaultValue={24} required className={`${inputClass} mt-2 normal-case tracking-normal`} />
          <span className="mt-1 block text-[11px] font-semibold normal-case tracking-normal text-slate-400">Hours before this popup can show again to the same user.</span>
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700"><input name="isActive" type="checkbox" defaultChecked className="h-5 w-5 rounded border-slate-300" />Active</label>
        <button disabled={disabled} className={`${buttonClass} w-full bg-emerald-600`}>Add announcement</button>
      </form>
      <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
        {announcements.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No pop-up announcements yet.</p>}
        {announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex gap-3">
              <img src={announcement.imageUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-black text-navy">{announcement.title}</p>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${announcement.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{announcement.isActive ? "Active" : "Hidden"}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{announcement.description}</p>
                <p className="mt-1 truncate text-xs font-black text-indigo-600">{announcement.linkUrl}</p>
                <p className="mt-1 text-xs font-black text-emerald-700">Frequency: every {announcement.displayFrequencyHours} hour{announcement.displayFrequencyHours === 1 ? "" : "s"} per user</p>
              </div>
            </div>
            <form action={(formData) => onUpdate(announcement.id, { displayFrequencyHours: Number(formData.get("displayFrequencyHours") ?? announcement.displayFrequencyHours) }, "Announcement frequency updated.")} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input name="displayFrequencyHours" type="number" min={1} max={8760} step={1} defaultValue={announcement.displayFrequencyHours} required className={inputClass} aria-label="Popup frequency in hours" />
              <button disabled={disabled} className={`${buttonClass} bg-indigo-600`}>Save frequency</button>
            </form>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => onUpdate(announcement.id, { isActive: !announcement.isActive }, announcement.isActive ? "Announcement hidden." : "Announcement activated.")} className={`${buttonClass} ${announcement.isActive ? "bg-slate-700" : "bg-emerald-600"}`}>{announcement.isActive ? "Hide" : "Activate"}</button>
              <button type="button" disabled={disabled} onClick={() => onDelete(announcement.id)} className={`${buttonClass} bg-red-600`}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAccountPanel({ admins, disabled, onCreate }: { admins: AdminAccount[]; disabled: boolean; onCreate: (formData: FormData) => void }) { return <div className={panelClass}><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Admin access</p><h2 className="mt-1 text-2xl font-black text-navy">Create admin account</h2><form action={onCreate} className="mt-5 space-y-3"><input name="username" required className={inputClass} placeholder="admin username" /><input name="displayName" required className={inputClass} placeholder="Display name" /><input name="password" required minLength={8} type="password" className={inputClass} placeholder="Password" /><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input name="isSuperAdmin" type="checkbox" className="h-4 w-4 rounded border-slate-300" />Super admin privileges</label><button disabled={disabled} className={`${buttonClass} w-full bg-indigo-600`}>Create admin</button></form><div className="mt-5 max-h-48 space-y-2 overflow-y-auto pr-1">{admins.map((account) => <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="font-black text-navy">{account.displayName}</p><p className="text-xs font-bold text-slate-500">{account.username} · {account.isSuperAdmin ? "Super admin" : "Admin"}</p></div>)}</div></div>; }
function StreamPanel({ streams, competitions, disabled, onCreate, onLoadCompetitions, onImportCompetition }: { streams: AdminTournament[]; competitions: ApiCompetition[]; disabled: boolean; onCreate: (formData: FormData) => void; onLoadCompetitions: () => void; onImportCompetition: (code: string) => void }) { return <div className={panelClass}><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Streams</p><h2 className="mt-1 text-2xl font-black text-navy">Create competition stream</h2><div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-emerald-800">Add league from football API</h3><p className="mt-1 text-xs font-semibold text-emerald-700/80">Load available competitions, then import one to create its stream and sync upcoming fixtures.</p></div><button type="button" disabled={disabled} onClick={onLoadCompetitions} className={`${buttonClass} bg-emerald-600`}>Load API leagues</button></div><div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{competitions.length === 0 && <p className="rounded-xl bg-white/70 p-3 text-xs font-bold text-emerald-700">No API leagues loaded yet.</p>}{competitions.map((competition) => <div key={competition.externalId} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><div><p className="font-black text-navy">{competition.name}</p><p className="text-xs font-bold text-slate-500">{competition.code} · {competition.areaName ?? "International"} · {formatDate(competition.startsAt)}–{formatDate(competition.endsAt)}</p></div><button type="button" disabled={disabled || competition.isAdded} onClick={() => onImportCompetition(competition.code)} className={`${buttonClass} ${competition.isAdded ? "bg-slate-300" : "bg-indigo-600"}`}>{competition.isAdded ? "Added" : "Add & sync"}</button></div>)}</div></div><form action={onCreate} className="mt-5 space-y-3"><input name="name" required className={inputClass} placeholder="World Cup 2026" /><input name="startsAt" required type="datetime-local" className={inputClass} /><input name="endsAt" type="datetime-local" className={inputClass} /><input name="hostCountries" className={inputClass} placeholder="USA, Canada, Mexico" /><button disabled={disabled} className={`${buttonClass} w-full bg-emerald-600`}>Create manual stream</button></form><div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">{streams.map((stream) => <div key={stream.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="font-black text-navy">{stream.name}</p><p className="text-xs font-bold text-slate-500">{stream.slug} · {stream.externalId ?? "manual"} · {stream.isActive ? "Visible" : "Hidden"}</p></div>)}</div></div>; }
