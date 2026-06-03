"use client";

import { formatAppDateTime } from "@/lib/dateTime";
import { useEffect, useRef, useState, useTransition } from "react";
import { PlatformLogo } from "@/components/Icons";

const panelClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const buttonClass = "rounded-xl px-4 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-70";
const maxAnnouncementImageBytes = 6 * 1024 * 1024;
const maxBannerImageBytes = 6 * 1024 * 1024;
const maxLoginBackgroundImageBytes = 6 * 1024 * 1024;


type AdminSession = { id: string; username: string; displayName: string; isSuperAdmin: boolean; twoFactorEnabled: boolean };
type AdminAccount = { id: string; username: string; displayName: string; isSuperAdmin: boolean; twoFactorEnabled: boolean; createdAt: string };
type AdminUser = {
  id: string; email: string; displayName: string; avatarUrl?: string | null; globalPoints: number;
  exactScoresCount: number; correctOutcomesCount: number; isAdmin: boolean; isBanned: boolean; banReason?: string | null;
  isGlobalLeagueMember: boolean;
};
type AdminTournament = { id: string; name: string; slug: string; startsAt: string; endsAt?: string | null; syncFromAt?: string | null; isActive: boolean; externalId?: string | null };
type ApiCompetition = { code: string; name: string; externalId: string; areaName?: string | null; startsAt: string; endsAt?: string | null; isAdded: boolean };
type AdminAnnouncement = { id: string; title: string; description: string; imageUrl: string; linkUrl: string; isActive: boolean; displayFrequencyHours: number; createdAt: string; updatedAt: string };
type PlayerCatalogSource = "API" | "MANUAL";
type AdminPlayer = { id: string; sequenceNumber?: number | null; name: string; nationalTeam: string; position: string; groupName: string };
type AdminMatchOption = { id: number; kickoffTime: string; homeTeam: string; awayTeam: string; homeScore90?: number | null; awayScore90?: number | null; homeScore?: number | null; awayScore?: number | null };
type OpsPayload = {
  settings: { announcementText?: string | null; bannerImageUrl?: string | null; loginBackgroundImageUrl?: string | null; maintenanceMode: boolean; gameRulesHtml?: string | null; termsConditionsHtml?: string | null; updatedAt: string };
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
type PredictionFilter = "all" | "awarded" | "notAwarded";
type PredictionRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  predictedOutcome?: "HOME" | "DRAW" | "AWAY" | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  pointsAwarded?: number | null;
  isCorrectOutcome?: boolean;
  isExactScore?: boolean;
  submittedAt: string;
  scoredAt?: string | null;
};
type AdminTab = "overview" | "players" | "users" | "predictions" | "announcements" | "matches" | "tournaments" | "settings" | "admins";

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

function fileToText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read document file"));
    reader.readAsText(file);
  });
}

function textToHtml(text: string) {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>`).join("");
}

function predictionOutcomeLabel(outcome?: "HOME" | "DRAW" | "AWAY" | null) {
  if (outcome === "HOME") return "Home Win";
  if (outcome === "AWAY") return "Away Win";
  if (outcome === "DRAW") return "Draw";
  return "—";
}

function awardedPointsBreakdown(prediction: PredictionRow) {
  if (prediction.pointsAwarded === null || prediction.pointsAwarded === undefined) return "pending";
  const outcomePoints = prediction.isCorrectOutcome ? 1 : 0;
  const exactScorePoints = prediction.isExactScore ? 3 : 0;
  return `${outcomePoints},${exactScorePoints}`;
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
  const [recalcDate, setRecalcDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recalcMatches, setRecalcMatches] = useState<AdminMatchOption[]>([]);
  const [recalcFilter, setRecalcFilter] = useState("");
  const [importStartFrom, setImportStartFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [predictionRows, setPredictionRows] = useState<PredictionRow[]>([]);
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>("all");
  const [predictionUserId, setPredictionUserId] = useState("");
  const [predictionUserSearch, setPredictionUserSearch] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

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

  function handleLogin(nextAdmin: AdminSession) { setAdmin(nextAdmin); setMessage(`Welcome, ${nextAdmin.displayName}.`); setTwoFactorSetup(null); setTwoFactorCode(""); loadAdminData("", nextAdmin); }
  function logout() {
    setError(null);
    startTransition(async () => { try { await adminJson("/api/admin/auth/logout", { method: "POST" }); } finally { setAdmin(null); setAdmins([]); setUsers([]); setStreams([]); setOps(null); setMessage(null); setTwoFactorSetup(null); setTwoFactorCode(""); } });
  }

  function beginTwoFactorSetup() {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ enabled: boolean; secret?: string; otpauthUri?: string }>("/api/admin/auth/2fa/setup");
        if (data.enabled) {
          setAdmin((current) => current ? { ...current, twoFactorEnabled: true } : current);
          setMessage("Two-factor authentication is already enabled for this admin account.");
          return;
        }
        if (data.secret && data.otpauthUri) setTwoFactorSetup({ secret: data.secret, otpauthUri: data.otpauthUri });
      } catch (setupError) { setError(setupError instanceof Error ? setupError.message : "Could not start 2FA setup"); }
    });
  }

  function confirmTwoFactorSetup() {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ admin: AdminSession }>("/api/admin/auth/2fa/setup", { method: "POST", body: JSON.stringify({ code: twoFactorCode }) });
        setAdmin(data.admin);
        setTwoFactorSetup(null);
        setTwoFactorCode("");
        setMessage("Two-factor authentication enabled. Your next admin login will require an authenticator code.");
      } catch (setupError) { setError(setupError instanceof Error ? setupError.message : "Could not verify authenticator code"); }
    });
  }

  function updateUser(id: string, payload: Record<string, unknown>, success: string) {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setUsers((current) => current.map((user) => user.id === id ? { ...user, ...data.user } : user));
        setMessage(success);
      } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Could not update user"); }
    });
  }

  function deleteUser(id: string, label: string) {
    if (!window.confirm(`Delete ${label}? This permanently removes their account, sessions, predictions, league memberships, notifications, and share cards.`)) return;
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        await adminJson(`/api/admin/users/${id}`, { method: "DELETE" });
        setUsers((current) => current.filter((user) => user.id !== id));
        setAudit(null);
        setMessage(`${label} deleted.`);
        loadAdminData();
      } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete user"); }
    });
  }

  function removeFromGlobalLeague(id: string, label: string) {
    if (!window.confirm(`Remove ${label} from the global league? Their account and points will remain, but they will no longer appear in the global standings.`)) return;
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        await adminJson(`/api/admin/users/${id}/global-league`, { method: "DELETE" });
        setUsers((current) => current.map((user) => user.id === id ? { ...user, isGlobalLeagueMember: false } : user));
        setMessage(`${label} removed from the global league.`);
        loadAdminData();
      } catch (globalLeagueError) { setError(globalLeagueError instanceof Error ? globalLeagueError.message : "Could not remove user from global league"); }
    });
  }

  function hardResetDatabase(formData: FormData) {
    const confirmation = String(formData.get("confirmation") ?? "").trim();
    if (confirmation !== "HARD RESET") { setError("Type HARD RESET to confirm the database reset."); return; }
    if (!window.confirm("Hard reset the database now? This deletes all players, predictions, leagues, tournaments, matches, announcements, sessions, and settings. Admin accounts are kept.")) return;
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        await adminJson("/api/admin/database/reset", { method: "POST", body: JSON.stringify({ confirmation }) });
        setUsers([]); setStreams([]); setOps(null); setAudit(null); setPredictionRows([]); setApiCompetitions([]); setRecalcMatches([]);
        setMessage("Database hard reset complete. Admin accounts were kept.");
        loadAdminData();
      } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "Could not hard reset database"); }
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
    startTransition(async () => { try { const data = await adminJson<{ tournament: AdminTournament; sync: { upserted: number; queuedForScoring: number } }>("/api/admin/tournaments/import", { method: "POST", body: JSON.stringify({ code, startFrom: new Date(`${importStartFrom}T00:00:00.000Z`).toISOString() }) }); setMessage(`${data.tournament.name} added from API with ${data.sync.upserted} synced fixtures.`); await loadAdminData(); await loadApiCompetitions(); } catch (importError) { setError(importError instanceof Error ? importError.message : "Could not import API league"); } });
  }

  function overrideScore(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    const payload = { homeScore: Number(formData.get("homeScore")), awayScore: Number(formData.get("awayScore")) };
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson(`/api/admin/matches/${matchId}/override`, { method: "POST", body: JSON.stringify(payload) }); setMessage(`Match ${matchId} score overridden and queued for scoring.`); loadAdminData(); } catch (scoreError) { setError(scoreError instanceof Error ? scoreError.message : "Could not override score"); } });
  }


  function runFixtureSyncNow() {
    setError(null); setMessage(null);
    startTransition(async () => {
      try {
        const result = await adminJson<{ upserted: number; queuedForScoring: number }>("/api/admin/matches/sync", { method: "POST" });
        setMessage(`Fixture sync completed. Updated ${result.upserted} matches and queued ${result.queuedForScoring} for scoring.`);
        loadAdminData();
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Could not run fixture sync");
      }
    });
  }

  function recalculate(formData: FormData) {
    const selectedMatchId = String(formData.get("matchId") ?? "").trim();
    const manualMatchId = String(formData.get("manualMatchId") ?? "").trim();
    const matchId = manualMatchId || selectedMatchId;
    setError(null); setMessage(null);
    if (!matchId) { setError("Select a finished match or enter a Match ID."); return; }
    startTransition(async () => { try { const result = await adminJson<{ scoredPredictions: number }>(`/api/admin/matches/${matchId}/recalculate`, { method: "POST" }); setMessage(`Match ${matchId} points recalculated for ${result.scoredPredictions} predictions.`); loadAdminData(); } catch (recalcError) { setError(recalcError instanceof Error ? recalcError.message : "Could not recalculate match"); } });
  }

  function loadRecalculateMatches(date = recalcDate) {
    setError(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ matches: AdminMatchOption[] }>(`/api/admin/matches?date=${encodeURIComponent(date)}`);
        setRecalcMatches(data.matches);
      } catch (recalcMatchesError) {
        setError(recalcMatchesError instanceof Error ? recalcMatchesError.message : "Could not load finished matches");
      }
    });
  }

  async function saveSettings(formData: FormData) {
    setError(null); setMessage(null);
    try {
      let bannerImageUrl: string | null | undefined;
      let loginBackgroundImageUrl: string | null | undefined;
      const bannerImage = formData.get("bannerImage");
      const loginBackgroundImage = formData.get("loginBackgroundImage");
      const clearBanner = formData.get("clearBanner") === "on";
      const clearLoginBackground = formData.get("clearLoginBackground") === "on";
      if (clearBanner) {
        bannerImageUrl = null;
      } else if (bannerImage instanceof File && bannerImage.size > 0) {
        if (!bannerImage.type.startsWith("image/")) { setError("Please upload a valid image file for the homepage banner."); return; }
        if (bannerImage.size > maxBannerImageBytes) { setError("Homepage banner image must be 6 MB or smaller."); return; }
        bannerImageUrl = await fileToDataUrl(bannerImage);
      }
      if (clearLoginBackground) {
        loginBackgroundImageUrl = null;
      } else if (loginBackgroundImage instanceof File && loginBackgroundImage.size > 0) {
        if (!loginBackgroundImage.type.startsWith("image/")) { setError("Please upload a valid image file for the login background."); return; }
        if (loginBackgroundImage.size > maxLoginBackgroundImageBytes) { setError("Login background image must be 6 MB or smaller."); return; }
        loginBackgroundImageUrl = await fileToDataUrl(loginBackgroundImage);
      }
      const payload: Record<string, unknown> = {};
      if (formData.has("announcementText")) payload.announcementText = String(formData.get("announcementText") ?? "");
      if (bannerImageUrl !== undefined) payload.bannerImageUrl = bannerImageUrl;
      if (loginBackgroundImageUrl !== undefined) payload.loginBackgroundImageUrl = loginBackgroundImageUrl;
      if (formData.has("maintenanceMode")) payload.maintenanceMode = formData.get("maintenanceMode") === "on";
      if (formData.has("gameRulesHtml")) payload.gameRulesHtml = String(formData.get("gameRulesHtml") ?? "");
      if (formData.has("termsConditionsHtml")) payload.termsConditionsHtml = String(formData.get("termsConditionsHtml") ?? "");
      startTransition(async () => { try { await adminJson("/api/admin/settings", { method: "PATCH", body: JSON.stringify(payload) }); setMessage("Global settings updated."); loadAdminData(); } catch (settingsError) { setError(settingsError instanceof Error ? settingsError.message : "Could not save settings"); } });
    } catch (imageError) { setError(imageError instanceof Error ? imageError.message : "Could not read image file"); }
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

  function deleteTournament(id: string) {
    setError(null); setMessage(null);
    startTransition(async () => { try { await adminJson(`/api/admin/tournaments/${id}`, { method: "DELETE" }); setMessage("League removed."); loadAdminData(); await loadApiCompetitions(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not remove league"); } });
  }

  function loadAudit(id: string) {
    setError(null);
    startTransition(async () => { try { setAudit(await adminJson<AuditPayload>(`/api/admin/users/${id}/audit`)); } catch (auditError) { setError(auditError instanceof Error ? auditError.message : "Could not load audit trail"); } });
  }
  function loadPredictions(filter = predictionFilter, userId = predictionUserId) {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (filter !== "all") params.set("filter", filter);
        if (userId) params.set("userId", userId);
        const data = await adminJson<{ predictions: PredictionRow[] }>(`/api/admin/predictions${params.toString() ? `?${params.toString()}` : ""}`);
        setPredictionRows(data.predictions);
      } catch (predictionError) {
        setError(predictionError instanceof Error ? predictionError.message : "Could not load predictions");
      }
    });
  }

  useEffect(() => {
    if (activeTab === "matches" && admin) loadRecalculateMatches(recalcDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, admin]);
  useEffect(() => {
    if (activeTab === "predictions" && admin) loadPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, admin]);

  if (!authChecked) return <main className="min-h-dvh bg-slate-950 p-8 text-white">Checking admin access…</main>;
  if (!admin) return <AdminLogin onLogin={handleLogin} />;

  const filteredRecalcMatches = recalcMatches.filter((match) => {
    const queryText = recalcFilter.trim().toLowerCase();
    if (!queryText) return true;
    return `${match.id} ${match.homeTeam} ${match.awayTeam}`.toLowerCase().includes(queryText);
  });

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
        <AdminTwoFactorPanel admin={admin} setup={twoFactorSetup} code={twoFactorCode} disabled={isPending} onBeginSetup={beginTwoFactorSetup} onCodeChange={setTwoFactorCode} onConfirm={confirmTwoFactorSetup} />

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

          {activeTab === "players" && <PlayerMasterPanel disabled={isPending} onError={setError} onMessage={setMessage} />}

          {activeTab === "matches" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Matches & Operations</p><h2 className="mt-1 text-2xl font-black text-navy">Scores and recalculation tools</h2>
              <div className="mt-4"><button type="button" onClick={runFixtureSyncNow} disabled={isPending} className={`${buttonClass} bg-emerald-600`}>Fetch scores from API now</button><p className="mt-1 text-xs font-semibold text-slate-500">Runs fixture ingestion immediately (bypasses scheduler), then queues completed matches for scoring.</p></div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <form action={overrideScore} className="rounded-2xl border border-red-100 bg-red-50 p-4"><h3 className="font-black text-red-700">Manual result overwrite</h3><p className="mt-1 text-xs font-semibold text-red-600/80">Inputs final 90-minute score and forces FINISHED.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_90px_90px]"><input name="matchId" className={inputClass} placeholder="Match ID" type="number" required /><input name="homeScore" className={inputClass} placeholder="Home" type="number" min="0" required /><input name="awayScore" className={inputClass} placeholder="Away" type="number" min="0" required /></div><button disabled={isPending} className={`${buttonClass} mt-3 w-full bg-red-600`}>Override final score</button></form>
                <form action={recalculate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-navy">Point recalculation trigger</h3><p className="mt-1 text-xs font-semibold text-slate-500">Pick a finished match by date/filter, or type a Match ID directly.</p><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><input type="date" value={recalcDate} onChange={(event) => setRecalcDate(event.target.value)} className={inputClass} /><button type="button" onClick={() => loadRecalculateMatches(recalcDate)} disabled={isPending || !recalcDate} className={`${buttonClass} bg-slate-600`}>Load date</button></div><input value={recalcFilter} onChange={(event) => setRecalcFilter(event.target.value)} className={`${inputClass} mt-3`} placeholder="Filter by match ID or team name" /><select name="matchId" className={`${inputClass} mt-3`}><option value="">Select finished match</option>{filteredRecalcMatches.map((match) => { const home = match.homeScore90 ?? match.homeScore ?? "–"; const away = match.awayScore90 ?? match.awayScore ?? "–"; return <option key={match.id} value={match.id}>{`#${match.id} · ${match.homeTeam} ${home}-${away} ${match.awayTeam} · ${formatAppDateTime(match.kickoffTime)}`}</option>; })}</select><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input name="manualMatchId" className={inputClass} placeholder="Or enter Match ID manually" type="number" /><button disabled={isPending} className={`${buttonClass} bg-slate-800`}>Recalculate points</button></div></form>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Moderation & User Management</p><h2 className="mt-1 text-2xl font-black text-navy">Accounts, audit logs, points & bans</h2>
              <form action={() => loadAdminData(query)} className="mt-5 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search user by email or display name" /><button disabled={isPending} className={`${buttonClass} bg-navy`}>Search</button></form>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400"><th className="py-3 pr-4">User</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Exact</th><th className="px-4 py-3">Outcomes</th><th className="px-4 py-3">Status</th><th className="py-3 pl-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <UserRow key={user.id} user={user} disabled={isPending} onUpdate={updateUser} onAudit={loadAudit} onDelete={deleteUser} onRemoveFromGlobalLeague={removeFromGlobalLeague} />)}</tbody></table></div>
              {audit && <AuditPanel audit={audit} />}
            </div>
          )}
          {activeTab === "predictions" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Prediction Audit</p><h2 className="mt-1 text-2xl font-black text-navy">All user predictions and awarded points</h2>
              <form action={() => loadPredictions()} className="mt-5 grid gap-3 md:grid-cols-3">
                <select value={predictionFilter} onChange={(event) => setPredictionFilter(event.target.value as PredictionFilter)} className={inputClass}>
                  <option value="all">All predictions</option>
                  <option value="awarded">Awarded points only</option>
                  <option value="notAwarded">Not awarded yet</option>
                </select>
                <div>
                  <input list="prediction-user-options" value={predictionUserSearch} onChange={(event) => { const selected = users.find((user) => `${user.displayName} (${user.email})` === event.target.value); setPredictionUserSearch(event.target.value); setPredictionUserId(selected?.id ?? ""); }} className={inputClass} placeholder="Type to search user name" />
                  <datalist id="prediction-user-options">{users.map((user) => <option key={user.id} value={`${user.displayName} (${user.email})`} />)}</datalist>
                </div>
                <button disabled={isPending} className={`${buttonClass} bg-navy`}>Apply filters</button>
              </form>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400"><th className="py-3 pr-4">User</th><th className="px-4 py-3">Match</th><th className="px-4 py-3">Prediction</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Submitted</th><th className="py-3 pl-4">Scored</th></tr></thead><tbody className="divide-y divide-slate-100">{predictionRows.map((row) => <tr key={row.id}><td className="py-3 pr-4"><p className="font-black text-navy">{row.userName}</p><p className="text-xs font-semibold text-slate-500">{row.userEmail}</p></td><td className="px-4 py-3 font-semibold text-slate-600">#{row.matchId} {row.homeTeam} vs {row.awayTeam}</td><td className="px-4 py-3 font-semibold text-slate-600"><p>{row.predictedHomeScore ?? "—"} - {row.predictedAwayScore ?? "—"}</p><p className="text-xs text-slate-500">{predictionOutcomeLabel(row.predictedOutcome)}</p></td><td className="px-4 py-3 font-black text-slate-900"><p>{awardedPointsBreakdown(row)}</p><p className="text-xs font-semibold text-slate-500">{row.pointsAwarded ?? "pending"} total</p></td><td className="px-4 py-3 font-semibold text-slate-600">{formatDate(row.submittedAt)}</td><td className="py-3 pl-4 font-semibold text-slate-600">{formatDate(row.scoredAt)}</td></tr>)}</tbody></table></div>
            </div>
          )}

          {activeTab === "announcements" && <AnnouncementAdminPanel announcements={ops?.announcements ?? []} settings={ops?.settings} disabled={isPending} onCreate={createAnnouncement} onUpdate={updateAnnouncement} onDelete={deleteAnnouncement} onSaveSettings={saveSettings} />}

          {activeTab === "settings" && (
            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Global Settings</p><h2 className="mt-1 text-2xl font-black text-navy">Site controls</h2>
              <form action={saveSettings} className="mt-5 space-y-3"><label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700"><input name="maintenanceMode" type="checkbox" defaultChecked={ops?.settings.maintenanceMode ?? false} className="h-5 w-5 rounded border-slate-300" />Maintenance mode</label><button disabled={isPending} className={`${buttonClass} w-full bg-amber-600`}>Publish settings</button></form>
              <LegalContentAdminPanel settings={ops?.settings} disabled={isPending} onSaveSettings={saveSettings} />
              {admin.isSuperAdmin && <form action={hardResetDatabase} className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="font-black text-red-700">Hard reset database</h3><p className="mt-1 text-sm font-semibold text-red-700/80">Deletes all player accounts, predictions, leagues, tournaments, matches, announcements, sessions, job status, and app settings. Admin accounts are kept so you can sign back in.</p><input name="confirmation" className={`${inputClass} mt-4 border-red-200`} placeholder="Type HARD RESET" autoComplete="off" /><button disabled={isPending} className={`${buttonClass} mt-3 w-full bg-red-700`}>Hard reset database</button></form>}
            </div>
          )}

          {activeTab === "tournaments" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <div className={panelClass}>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Tournament outrights</p><h2 className="mt-1 text-2xl font-black text-navy">Golden Ball / Glove settlement</h2>
                <form action={settleOutrights} className="mt-5 space-y-3"><select name="tournamentId" required className={inputClass}>{(ops?.tournaments ?? streams).map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select><input name="goldenBallPlayerId" required className={inputClass} placeholder="Golden Ball player UUID" /><input name="goldenGlovePlayerId" required className={inputClass} placeholder="Golden Glove player UUID" /><button disabled={isPending} className={`${buttonClass} w-full bg-emerald-600`}>Settle final awards</button></form>
                <div className="mt-4 space-y-2">{ops?.settlements.map((settlement) => <div key={settlement.id} className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{formatDate(settlement.settledAt)} · Ball: {settlement.goldenBallPlayer.name} · Glove: {settlement.goldenGlovePlayer.name}</div>)}</div>
              </div>
              <StreamPanel streams={streams} competitions={apiCompetitions} disabled={isPending} onCreate={createStream} onLoadCompetitions={loadApiCompetitions} onImportCompetition={importApiCompetition} importStartFrom={importStartFrom} onImportStartFromChange={setImportStartFrom} onDeleteTournament={deleteTournament} />
            </div>
          )}

          {activeTab === "admins" && admin.isSuperAdmin && <AdminAccountPanel admins={admins} disabled={isPending} onCreate={createAdminAccount} />}
        </section>
      </div>
    </main>
  );
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function playerPayload(formData: FormData) {
  return {
    sequenceNumber: Number(formData.get("sequenceNumber")),
    name: String(formData.get("name") ?? ""),
    nationalTeam: String(formData.get("nationalTeam") ?? ""),
    position: String(formData.get("position") ?? ""),
    groupName: String(formData.get("groupName") ?? "")
  };
}

function PlayerMasterPanel({ disabled, onError, onMessage }: { disabled: boolean; onError: (message: string | null) => void; onMessage: (message: string | null) => void }) {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [playerCatalogSource, setPlayerCatalogSource] = useState<PlayerCatalogSource>("API");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  async function loadPlayers() {
    setIsLoading(true);
    try {
      const data = await adminJson<{ players: AdminPlayer[]; playerCatalogSource: PlayerCatalogSource; counts: Record<string, number> }>("/api/admin/players");
      setPlayers(data.players);
      setPlayerCatalogSource(data.playerCatalogSource);
      setCounts(data.counts ?? {});
    } catch (caught) { onError(caught instanceof Error ? caught.message : "Could not load player master"); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { void loadPlayers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changePlayerCatalogSource(source: PlayerCatalogSource) {
    onError(null); onMessage(null);
    try {
      const data = await adminJson<{ playerCatalogSource: PlayerCatalogSource }>("/api/admin/players", { method: "PATCH", body: JSON.stringify({ playerCatalogSource: source }) });
      setPlayerCatalogSource(data.playerCatalogSource);
      onMessage(data.playerCatalogSource === "API" ? "Award player options now use the API-synced player list." : "Award player options now use the manual player master list.");
    } catch (caught) { onError(caught instanceof Error ? caught.message : "Could not update player source"); }
  }

  async function upload(file?: File) {
    if (!file) return;
    onError(null); onMessage(null);
    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim());
      const header = parseCsvLine(lines.shift() ?? "").map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ""));
      const find = (...names: string[]) => names.map((name) => header.indexOf(name)).find((index) => index !== -1) ?? -1;
      const indexes = { sequenceNumber: find("no", "sequencenumber"), name: find("playername", "name"), nationalTeam: find("nationalteam", "team"), position: find("position"), groupName: find("group", "groupname") };
      if (Object.values(indexes).some((index) => index < 0)) throw new Error("CSV header must include No., Player Name, National Team, Position, and Group");
      const rows = lines.map((line) => { const cells = parseCsvLine(line); return { sequenceNumber: Number(cells[indexes.sequenceNumber]), name: cells[indexes.name], nationalTeam: cells[indexes.nationalTeam], position: cells[indexes.position], groupName: cells[indexes.groupName] }; });
      const result = await adminJson<{ imported: number }>("/api/admin/players", { method: "POST", body: JSON.stringify({ players: rows }) });
      onMessage(`${result.imported} WC26 player master rows imported.`); await loadPlayers();
    } catch (caught) { onError(caught instanceof Error ? caught.message : "Could not import player master"); }
  }
  async function save(id: string, formData: FormData) {
    onError(null); onMessage(null);
    try { await adminJson(`/api/admin/players/${id}`, { method: "PUT", body: JSON.stringify(playerPayload(formData)) }); onMessage("Player master row updated."); await loadPlayers(); }
    catch (caught) { onError(caught instanceof Error ? caught.message : "Could not update player"); }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this player master row? Existing submitted award predictions may prevent deletion.")) return;
    onError(null); onMessage(null);
    try { await adminJson(`/api/admin/players/${id}`, { method: "DELETE" }); onMessage("Player master row deleted."); await loadPlayers(); }
    catch (caught) { onError(caught instanceof Error ? caught.message : "Could not delete player"); }
  }

  return <div className={panelClass}>
    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">WC26 player master</p><h2 className="mt-1 text-2xl font-black text-navy">Choose API or manual award candidates</h2>
    <p className="mt-2 text-sm font-semibold text-slate-500">Golden Ball, Golden Glove, Golden Boot, and FIFA Young Player Award options can come from the API-synced list or from the manual CSV master below.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {(["API", "MANUAL"] as PlayerCatalogSource[]).map((source) => <button key={source} type="button" disabled={disabled || playerCatalogSource === source} onClick={() => void changePlayerCatalogSource(source)} className={`rounded-2xl border p-4 text-left transition ${playerCatalogSource === source ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-emerald-200"}`}>
        <span className="text-sm font-black text-navy">{source === "API" ? "Use player list from API" : "Use manual upload"}</span>
        <span className="mt-1 block text-xs font-bold text-slate-500">{source === "API" ? `${counts.API ?? 0} API-synced rows available` : `${counts.MANUAL ?? 0} manual rows available`}</span>
      </button>)}
    </div>
    <p className="mt-4 text-sm font-semibold text-slate-500">Manual upload CSV columns: No., Player Name, National Team, Position, Group. Allowed positions are Goalkeeper, Defender, Midfielder, and Forward.</p>
    <label className="mt-5 block rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm font-black text-emerald-800">Upload manual player master CSV<input type="file" accept=".csv,text/csv" disabled={disabled} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} className="mt-3 block w-full text-xs font-semibold" /></label>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400"><th className="py-3 pr-2">No.</th><th className="px-2 py-3">Player name</th><th className="px-2 py-3">National team</th><th className="px-2 py-3">Position</th><th className="px-2 py-3">Group</th><th className="py-3 pl-2">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{players.map((player) => <tr key={player.id}><td colSpan={6} className="py-2"><form action={(formData) => save(player.id, formData)} className="grid grid-cols-[70px_1.4fr_1fr_160px_80px_150px] gap-2"><input name="sequenceNumber" type="number" min="1" required defaultValue={player.sequenceNumber ?? ""} className={inputClass} /><input name="name" required defaultValue={player.name} className={inputClass} /><input name="nationalTeam" required defaultValue={player.nationalTeam} className={inputClass} /><select name="position" required defaultValue={player.position} className={inputClass}><option>Goalkeeper</option><option>Defender</option><option>Midfielder</option><option>Forward</option></select><input name="groupName" required defaultValue={player.groupName} className={inputClass} /><div className="flex gap-2"><button disabled={disabled} className={`${buttonClass} bg-emerald-600`}>Save</button><button type="button" disabled={disabled} onClick={() => void remove(player.id)} className={`${buttonClass} bg-red-600`}>Delete</button></div></form></td></tr>)}</tbody></table></div>
    {isLoading && <p className="mt-4 text-sm font-bold text-slate-500">Loading player master…</p>}{!isLoading && players.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">No player master rows uploaded yet.</p>}
  </div>;
}

function AdminTwoFactorPanel({ admin, setup, code, disabled, onBeginSetup, onCodeChange, onConfirm }: { admin: AdminSession; setup: { secret: string; otpauthUri: string } | null; code: string; disabled: boolean; onBeginSetup: () => void; onCodeChange: (code: string) => void; onConfirm: () => void }) {
  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${admin.twoFactorEnabled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.25em] ${admin.twoFactorEnabled ? "text-emerald-700" : "text-amber-700"}`}>Admin two-factor authentication</p>
          <h2 className="mt-1 text-xl font-black text-navy">{admin.twoFactorEnabled ? "Authenticator protection is enabled" : "Add an authenticator app before your next login"}</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">{admin.twoFactorEnabled ? "This admin account now requires a 6-digit authenticator code after the password is verified." : "You can use the admin console now, but after setup this account will require a 6-digit authenticator code on every future login."}</p>
        </div>
        {!admin.twoFactorEnabled && !setup && <button type="button" disabled={disabled} onClick={onBeginSetup} className={`${buttonClass} bg-amber-600`}>Set up 2FA</button>}
      </div>
      {!admin.twoFactorEnabled && setup && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm font-black text-navy">1. Add this account to your authenticator app</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Scan/import the otpauth URI if your app supports it, or manually enter the setup key.</p>
            <label className="mt-3 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Manual setup key<input value={setup.secret} readOnly className={`${inputClass} mt-2 font-mono tracking-widest`} onFocus={(event) => event.currentTarget.select()} /></label>
            <label className="mt-3 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Authenticator URI<textarea value={setup.otpauthUri} readOnly className={`${inputClass} mt-2 min-h-24 font-mono text-xs`} onFocus={(event) => event.currentTarget.select()} /></label>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-sm font-black text-navy">2. Verify the 6-digit code</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Enter the current code from your authenticator app to enable 2FA.</p>
            <input value={code} onChange={(event) => onCodeChange(event.target.value)} className={`${inputClass} mt-4`} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" />
            <button type="button" disabled={disabled || code.trim().length < 6} onClick={onConfirm} className={`${buttonClass} mt-3 w-full bg-emerald-600`}>Enable 2FA</button>
          </div>
        </div>
      )}
    </section>
  );
}

function AdminLogin({ onLogin }: { onLogin: (admin: AdminSession) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isPending, startTransition] = useTransition();

  function login(formData: FormData) {
    const payload = { username: String(formData.get("username") ?? credentials.username), password: String(formData.get("password") ?? credentials.password), totpCode: String(formData.get("totpCode") ?? "") };
    setError(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ admin?: AdminSession; twoFactorRequired?: boolean }>("/api/admin/auth/login", { method: "POST", body: JSON.stringify(payload) });
        if (data.twoFactorRequired) {
          setCredentials({ username: payload.username, password: payload.password });
          setTwoFactorRequired(true);
          return;
        }
        if (data.admin) onLogin(data.admin);
      } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Could not sign in"); }
    });
  }

  return <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-2xl"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white"><PlatformLogo className="h-12 w-12" /></span><div><p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Admin only</p><h1 className="text-3xl font-black text-navy">Admin Console</h1></div></div><p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">{twoFactorRequired ? "Enter the 6-digit code from your authenticator app to finish signing in." : "Use the separate admin username and password. Player accounts cannot sign in here."}</p>{error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<form action={login} className="mt-6 space-y-4">{twoFactorRequired ? <><input name="username" type="hidden" value={credentials.username} readOnly /><input name="password" type="hidden" value={credentials.password} readOnly /><input name="totpCode" className={inputClass} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" placeholder="Authenticator code" required autoFocus /><button disabled={isPending} className={`${buttonClass} w-full bg-navy`}>{isPending ? "Verifying…" : "Verify and sign in"}</button><button type="button" disabled={isPending} onClick={() => { setTwoFactorRequired(false); setCredentials({ username: "", password: "" }); setError(null); }} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-60">Use different credentials</button></> : <><input name="username" className={inputClass} autoComplete="username" placeholder="Admin username" required /><input name="password" className={inputClass} autoComplete="current-password" placeholder="Admin password" type="password" required /><button disabled={isPending} className={`${buttonClass} w-full bg-navy`}>{isPending ? "Signing in…" : "Sign in to admin"}</button></>}</form></section></main>;
}

function AdminTabs({ activeTab, isSuperAdmin, onChange }: { activeTab: AdminTab; isSuperAdmin: boolean; onChange: (tab: AdminTab) => void }) {
  const tabs: Array<{ id: AdminTab; label: string; description: string }> = [
    { id: "overview", label: "Overview", description: "Health and leagues" },
    { id: "users", label: "Users", description: "Moderation" },
    { id: "players", label: "Players", description: "WC26 player master" },
    { id: "predictions", label: "Predictions", description: "Points ledger" },
    { id: "announcements", label: "Banners & Popups", description: "Homepage and popup creatives" },
    { id: "matches", label: "Matches", description: "Scores and points" },
    { id: "tournaments", label: "Tournaments", description: "Streams and awards" },
    { id: "settings", label: "Settings", description: "Site controls" }
  ];
  if (isSuperAdmin) tabs.push({ id: "admins", label: "Admins", description: "Access control" });

  return (
    <nav aria-label="Admin sections" className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-9">
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

function UserRow({ user, disabled, onUpdate, onAudit, onDelete, onRemoveFromGlobalLeague }: { user: AdminUser; disabled: boolean; onUpdate: (id: string, payload: Record<string, unknown>, success: string) => void; onAudit: (id: string) => void; onDelete: (id: string, label: string) => void; onRemoveFromGlobalLeague: (id: string, label: string) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName); const [email, setEmail] = useState(user.email); const [globalPoints, setGlobalPoints] = useState(String(user.globalPoints)); const [exactScoresCount, setExactScoresCount] = useState(String(user.exactScoresCount)); const [correctOutcomesCount, setCorrectOutcomesCount] = useState(String(user.correctOutcomesCount)); const [banReason, setBanReason] = useState(user.banReason ?? ""); const [password, setPassword] = useState("");
  const label = `${user.displayName} (${user.email})`;
  return <tr className="align-top"><td className="py-4 pr-4"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} placeholder="Display name" /><input value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} placeholder="Email" />{user.isAdmin && <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Legacy admin</span>}{!user.isGlobalLeagueMember && <span className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Not in global league</span>}</td><td className="px-4 py-4"><input value={globalPoints} onChange={(event) => setGlobalPoints(event.target.value)} className={inputClass} type="number" /></td><td className="px-4 py-4"><input value={exactScoresCount} onChange={(event) => setExactScoresCount(event.target.value)} className={inputClass} type="number" min="0" /></td><td className="px-4 py-4"><input value={correctOutcomesCount} onChange={(event) => setCorrectOutcomesCount(event.target.value)} className={inputClass} type="number" min="0" /></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{user.isBanned ? "Banned" : "Active"}</span><textarea value={banReason} onChange={(event) => setBanReason(event.target.value)} className={`${inputClass} mt-3 min-h-20`} placeholder="Ban reason" /></td><td className="py-4 pl-4"><div className="grid min-w-[260px] gap-2"><button type="button" disabled={disabled} onClick={() => onUpdate(user.id, { displayName, email, globalPoints: Number(globalPoints), exactScoresCount: Number(exactScoresCount), correctOutcomesCount: Number(correctOutcomesCount) }, "User details and manual points updated.")} className={`${buttonClass} bg-indigo-600`}>Save details & points</button><button type="button" disabled={disabled} onClick={() => onUpdate(user.id, { isBanned: !user.isBanned, banReason: user.isBanned ? null : banReason }, user.isBanned ? "User restriction removed." : "User restricted from leaderboards.")} className={`${buttonClass} ${user.isBanned ? "bg-emerald-600" : "bg-red-600"}`}>{user.isBanned ? "Unban user" : "Ban / flag user"}</button><button type="button" disabled={disabled || !user.isGlobalLeagueMember} onClick={() => onRemoveFromGlobalLeague(user.id, label)} className={`${buttonClass} bg-orange-600`}>Remove from global league</button><button type="button" disabled={disabled} onClick={() => onAudit(user.id)} className={`${buttonClass} bg-slate-700`}>View audit trail</button><input value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="New password" type="password" /><button type="button" disabled={disabled || password.length < 8} onClick={() => { onUpdate(user.id, { password }, "Password reset."); setPassword(""); }} className={`${buttonClass} bg-slate-800`}>Reset password</button><button type="button" disabled={disabled} onClick={() => onDelete(user.id, label)} className={`${buttonClass} bg-red-800`}>Delete user</button></div></td></tr>;
}

function AuditPanel({ audit }: { audit: AuditPayload }) { return <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-navy">Audit trail: {audit.user.displayName} ({audit.user.email})</h3><p className="mt-1 text-xs font-semibold text-slate-500">Registered {formatDate(audit.user.registrationTimestamp)} · {audit.predictions.length} recent predictions</p><div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">{audit.predictions.map((prediction) => <div key={prediction.id} className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-600"><p className="font-black text-slate-900">#{prediction.matchId} {prediction.match.homeTeam} vs {prediction.match.awayTeam} · kickoff {formatDate(prediction.match.kickoffTime)}</p><p>Pick: {prediction.predictedHomeScore ?? "—"}-{prediction.predictedAwayScore ?? "—"} ({prediction.predictedOutcome ?? "outcome not set"}) · Points {prediction.pointsAwarded ?? "pending"} · Locked {prediction.isLocked ? "yes" : "no"}</p><p>Created {formatDate(prediction.submittedAt)} · Updated {formatDate(prediction.updatedAt)} · Scored {formatDate(prediction.scoredAt)}</p></div>)}</div></div>; }


function AnnouncementAdminPanel({ announcements, settings, disabled, onCreate, onUpdate, onDelete, onSaveSettings }: { announcements: AdminAnnouncement[]; settings?: { announcementText?: string | null; bannerImageUrl?: string | null; loginBackgroundImageUrl?: string | null; maintenanceMode: boolean; gameRulesHtml?: string | null; termsConditionsHtml?: string | null }; disabled: boolean; onCreate: (formData: FormData) => void; onUpdate: (id: string, payload: Partial<AdminAnnouncement>, success: string) => void; onDelete: (id: string) => void; onSaveSettings: (formData: FormData) => void }) {
  return (
    <div className={panelClass}>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Banners & pop-up announcements</p>
      <h2 className="mt-1 text-2xl font-black text-navy">Dashboard popup announcements</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">These announcements are used for popup announcements only. Use a landscape image (recommended 1600×600 px, 8:3 ratio, max 6 MB) so it looks sharp in the popup preview. The See more button uses the configured link.</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Homepage banner</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">Upload a dedicated home page banner and optional text strip. This is separate from popup announcements.</p>
        <form action={onSaveSettings} className="mt-4 space-y-3">
          <textarea name="announcementText" defaultValue={settings?.announcementText ?? ""} className={`${inputClass} min-h-24`} placeholder="Optional text banner message" />
          <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Banner image
            <input name="bannerImage" type="file" accept="image/*" className={`${inputClass} mt-2 normal-case tracking-normal`} />
          </label>
          {settings?.bannerImageUrl && <img src={settings.bannerImageUrl} alt="Current homepage banner" className="w-full rounded-2xl object-cover" />}
          <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-slate-700"><input name="clearBanner" type="checkbox" className="h-5 w-5 rounded border-slate-300" />Remove current homepage banner</label>
          <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">Login background image
            <input name="loginBackgroundImage" type="file" accept="image/*" className={`${inputClass} mt-2 normal-case tracking-normal`} />
          </label>
          {settings?.loginBackgroundImageUrl && <img src={settings.loginBackgroundImageUrl} alt="Current login background" className="w-full rounded-2xl object-cover" />}
          <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-slate-700"><input name="clearLoginBackground" type="checkbox" className="h-5 w-5 rounded border-slate-300" />Remove current login background image</label>

          <input type="hidden" name="maintenanceMode" value={settings?.maintenanceMode ? "on" : "off"} />
          <button disabled={disabled} className={`${buttonClass} w-full bg-amber-600`}>Save homepage banner</button>
        </form>
      </div>

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

function AdminAccountPanel({ admins, disabled, onCreate }: { admins: AdminAccount[]; disabled: boolean; onCreate: (formData: FormData) => void }) { return <div className={panelClass}><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Admin access</p><h2 className="mt-1 text-2xl font-black text-navy">Create admin account</h2><form action={onCreate} className="mt-5 space-y-3"><input name="username" required className={inputClass} placeholder="admin username" /><input name="displayName" required className={inputClass} placeholder="Display name" /><input name="password" required minLength={8} type="password" className={inputClass} placeholder="Password" /><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input name="isSuperAdmin" type="checkbox" className="h-4 w-4 rounded border-slate-300" />Super admin privileges</label><button disabled={disabled} className={`${buttonClass} w-full bg-indigo-600`}>Create admin</button></form><div className="mt-5 max-h-48 space-y-2 overflow-y-auto pr-1">{admins.map((account) => <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="font-black text-navy">{account.displayName}</p><p className="text-xs font-bold text-slate-500">{account.username} · {account.isSuperAdmin ? "Super admin" : "Admin"} · {account.twoFactorEnabled ? "2FA enabled" : "2FA not set"}</p></div>)}</div></div>; }
function StreamPanel({ streams, competitions, disabled, onCreate, onLoadCompetitions, onImportCompetition, importStartFrom, onImportStartFromChange, onDeleteTournament }: { streams: AdminTournament[]; competitions: ApiCompetition[]; disabled: boolean; onCreate: (formData: FormData) => void; onLoadCompetitions: () => void; onImportCompetition: (code: string) => void; importStartFrom: string; onImportStartFromChange: (value: string) => void; onDeleteTournament: (id: string) => void }) { return <div className={panelClass}><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Streams</p><h2 className="mt-1 text-2xl font-black text-navy">Create competition stream</h2><div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-emerald-800">Add league from football API</h3><p className="mt-1 text-xs font-semibold text-emerald-700/80">Load available competitions, then import one to create its stream and sync upcoming fixtures.</p></div><button type="button" disabled={disabled} onClick={onLoadCompetitions} className={`${buttonClass} bg-emerald-600`}>Load API leagues</button></div><label className="mt-3 block text-xs font-black uppercase tracking-[0.2em] text-emerald-800">Start from date<input type="date" value={importStartFrom} onChange={(event) => onImportStartFromChange(event.target.value)} className={`${inputClass} mt-2 border-emerald-200 bg-white normal-case tracking-normal`} /></label><p className="mt-2 text-[11px] font-semibold text-emerald-700/80">Only fixtures on/after this date are synced for imported leagues.</p><div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{competitions.length === 0 && <p className="rounded-xl bg-white/70 p-3 text-xs font-bold text-emerald-700">No API leagues loaded yet.</p>}{competitions.map((competition) => <div key={competition.externalId} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><div><p className="font-black text-navy">{competition.name}</p><p className="text-xs font-bold text-slate-500">{competition.code} · {competition.areaName ?? "International"} · {formatDate(competition.startsAt)}–{formatDate(competition.endsAt)}</p></div><button type="button" disabled={disabled || competition.isAdded} onClick={() => onImportCompetition(competition.code)} className={`${buttonClass} ${competition.isAdded ? "bg-slate-300" : "bg-indigo-600"}`}>{competition.isAdded ? "Added" : "Add & sync"}</button></div>)}</div></div><form action={onCreate} className="mt-5 space-y-3"><input name="name" required className={inputClass} placeholder="World Cup 2026" /><input name="startsAt" required type="datetime-local" className={inputClass} /><input name="endsAt" type="datetime-local" className={inputClass} /><input name="hostCountries" className={inputClass} placeholder="USA, Canada, Mexico" /><button disabled={disabled} className={`${buttonClass} w-full bg-emerald-600`}>Create manual stream</button></form><div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">{streams.map((stream) => <div key={stream.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-navy">{stream.name}</p><p className="text-xs font-bold text-slate-500">{stream.slug} · {stream.externalId ?? "manual"} · {stream.isActive ? "Visible" : "Hidden"}</p><p className="text-[11px] font-semibold text-slate-400">Start from: {formatDate(stream.syncFromAt)}</p></div><button type="button" disabled={disabled} onClick={() => onDeleteTournament(stream.id)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Remove</button></div></div>)}</div></div>; }

type LegalSettings = { gameRulesHtml?: string | null; termsConditionsHtml?: string | null };

function LegalContentAdminPanel({ settings, disabled, onSaveSettings }: { settings?: LegalSettings; disabled: boolean; onSaveSettings: (formData: FormData) => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">User setting pages</p>
      <h3 className="mt-1 text-xl font-black text-navy">Game Rules & Terms and Condition</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">Publish HTML content that appears in the user profile menu. Paste HTML, use the rich text toolbar, or upload a .html/.htm/.txt document.</p>
      <form action={onSaveSettings} className="mt-4 space-y-4">
        <RichTextSettingEditor name="gameRulesHtml" label="Game Rules" initialHtml={settings?.gameRulesHtml ?? ""} disabled={disabled} />
        <RichTextSettingEditor name="termsConditionsHtml" label="Terms and Condition" initialHtml={settings?.termsConditionsHtml ?? ""} disabled={disabled} />
        <button disabled={disabled} className={`${buttonClass} w-full bg-emerald-600`}>Publish Game Rules & Terms</button>
      </form>
    </div>
  );
}

function RichTextSettingEditor({ name, label, initialHtml, disabled }: { name: string; label: string; initialHtml: string; disabled: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);
  const [fileMessage, setFileMessage] = useState<string | null>(null);

  useEffect(() => {
    setHtml(initialHtml);
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) editorRef.current.innerHTML = initialHtml;
  }, [initialHtml]);

  function syncFromEditor() { setHtml(editorRef.current?.innerHTML ?? ""); }
  function format(command: string, value?: string) { editorRef.current?.focus(); document.execCommand(command, false, value); syncFromEditor(); }

  async function uploadDocument(file?: File) {
    setFileMessage(null);
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const supported = file.type.startsWith("text/") || lowerName.endsWith(".html") || lowerName.endsWith(".htm") || lowerName.endsWith(".txt");
    if (!supported) { setFileMessage("Please upload an HTML or text document."); return; }
    try {
      const text = await fileToText(file);
      const nextHtml = lowerName.endsWith(".txt") || file.type === "text/plain" ? textToHtml(text) : text;
      setHtml(nextHtml);
      if (editorRef.current) editorRef.current.innerHTML = nextHtml;
      setFileMessage(`${file.name} loaded into the editor.`);
    } catch (error) { setFileMessage(error instanceof Error ? error.message : "Could not read document file."); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold text-slate-500">This content is saved as HTML and rendered in the user setting menu.</p></div>
        <label className="shrink-0 cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">Upload<input type="file" accept=".html,.htm,.txt,text/html,text/plain" disabled={disabled} onChange={(event) => void uploadDocument(event.target.files?.[0])} className="hidden" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={() => format("bold")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Bold</button>
        <button type="button" disabled={disabled} onClick={() => format("italic")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Italic</button>
        <button type="button" disabled={disabled} onClick={() => format("insertUnorderedList")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Bullet list</button>
        <button type="button" disabled={disabled} onClick={() => format("insertOrderedList")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Number list</button>
        <button type="button" disabled={disabled} onClick={() => format("formatBlock", "h2")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Heading</button>
        <button type="button" disabled={disabled} onClick={() => format("formatBlock", "p")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 disabled:opacity-50">Paragraph</button>
      </div>
      <div ref={editorRef} contentEditable={!disabled} suppressContentEditableWarning onInput={syncFromEditor} onBlur={syncFromEditor} className="mt-3 min-h-48 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
      <textarea name={name} value={html} readOnly className="hidden" />
      {fileMessage && <p className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">{fileMessage}</p>}
    </div>
  );
}
