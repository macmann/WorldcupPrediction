"use client";

import { useEffect, useState, useTransition } from "react";
import { PlatformLogo } from "@/components/Icons";

const panelClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const buttonClass = "rounded-xl px-4 py-3 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-70";

type AdminSession = {
  id: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
};

type AdminAccount = {
  id: string;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  createdAt: string;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  globalPoints: number;
  exactScoresCount: number;
  correctOutcomesCount: number;
  isAdmin: boolean;
  isBanned: boolean;
  banReason?: string | null;
};

type AdminTournament = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
};

async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Admin request failed");
  return data;
}

export default function AdminConsole() {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [streams, setStreams] = useState<AdminTournament[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadAdminData(search = query, currentAdmin = admin) {
    setError(null);
    startTransition(async () => {
      try {
        const [userData, streamData, adminData] = await Promise.all([
          adminJson<{ users: AdminUser[] }>(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`),
          adminJson<{ tournaments: AdminTournament[] }>("/api/admin/tournaments"),
          currentAdmin?.isSuperAdmin ? adminJson<{ admins: AdminAccount[] }>("/api/admin/admins") : Promise.resolve({ admins: [] })
        ]);
        setUsers(userData.users);
        setStreams(streamData.tournaments);
        setAdmins(adminData.admins);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load admin data");
      }
    });
  }

  useEffect(() => {
    let mounted = true;
    adminJson<{ admin: AdminSession }>("/api/admin/auth/me")
      .then((data) => {
        if (!mounted) return;
        setAdmin(data.admin);
        setAuthChecked(true);
        loadAdminData("", data.admin);
      })
      .catch(() => {
        if (!mounted) return;
        setAdmin(null);
        setAuthChecked(true);
      });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(nextAdmin: AdminSession) {
    setAdmin(nextAdmin);
    setMessage(`Welcome, ${nextAdmin.displayName}.`);
    loadAdminData("", nextAdmin);
  }

  function logout() {
    setError(null);
    startTransition(async () => {
      try {
        await adminJson("/api/admin/auth/logout", { method: "POST" });
      } finally {
        setAdmin(null);
        setAdmins([]);
        setUsers([]);
        setStreams([]);
        setMessage(null);
      }
    });
  }

  function updateUser(id: string, payload: Record<string, unknown>, success: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setUsers((current) => current.map((user) => user.id === id ? data.user : user));
        setMessage(success);
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Could not update user");
      }
    });
  }

  function createAdminAccount(formData: FormData) {
    const username = String(formData.get("username") ?? "");
    const displayName = String(formData.get("displayName") ?? "");
    const password = String(formData.get("password") ?? "");
    const isSuperAdmin = formData.get("isSuperAdmin") === "on";
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ admin: AdminAccount }>("/api/admin/admins", {
          method: "POST",
          body: JSON.stringify({ username, displayName, password, isSuperAdmin })
        });
        setAdmins((current) => [...current, data.admin]);
        setMessage(`Admin account ${data.admin.username} created.`);
      } catch (adminError) {
        setError(adminError instanceof Error ? adminError.message : "Could not create admin account");
      }
    });
  }

  function createStream(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");
    const hostCountries = String(formData.get("hostCountries") ?? "")
      .split(",")
      .map((country) => country.trim())
      .filter(Boolean);

    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const data = await adminJson<{ tournament: AdminTournament }>("/api/admin/tournaments", {
          method: "POST",
          body: JSON.stringify({ name, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : null, hostCountries, isActive: true })
        });
        setStreams((current) => [data.tournament, ...current]);
        setMessage(`${data.tournament.name} stream is now visible to users.`);
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : "Could not create stream");
      }
    });
  }

  function overrideScore(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    const homeScore = Number(formData.get("homeScore"));
    const awayScore = Number(formData.get("awayScore"));
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await adminJson(`/api/admin/matches/${matchId}/override`, { method: "POST", body: JSON.stringify({ homeScore, awayScore }) });
        setMessage(`Match ${matchId} score overridden and queued for scoring.`);
      } catch (scoreError) {
        setError(scoreError instanceof Error ? scoreError.message : "Could not override score");
      }
    });
  }

  function toggleMatch(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    const isEnabled = formData.get("isEnabled") === "true";
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await adminJson(`/api/admin/matches/${matchId}/toggle`, { method: "PATCH", body: JSON.stringify({ isEnabled }) });
        setMessage(`Match ${matchId} ${isEnabled ? "enabled" : "disabled"}.`);
      } catch (matchError) {
        setError(matchError instanceof Error ? matchError.message : "Could not update match");
      }
    });
  }

  function recalculate(formData: FormData) {
    const matchId = String(formData.get("matchId") ?? "");
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await adminJson(`/api/admin/matches/${matchId}/recalculate`, { method: "POST" });
        setMessage(`Match ${matchId} points recalculated.`);
      } catch (recalcError) {
        setError(recalcError instanceof Error ? recalcError.message : "Could not recalculate match");
      }
    });
  }

  if (!authChecked) {
    return <main className="min-h-dvh bg-slate-950 p-8 text-white">Checking admin access…</main>;
  }

  if (!admin) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="border-b border-white/10 bg-navy px-8 py-6 text-white shadow-xl shadow-slate-900/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <PlatformLogo className="h-12 w-12" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Desktop Admin</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Operations Console</h1>
              <p className="mt-1 text-sm font-semibold text-white/70">Signed in as {admin.displayName} ({admin.username})</p>
            </div>
          </div>
          <button type="button" onClick={logout} disabled={isPending} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black ring-1 ring-white/15 transition hover:bg-white/15 disabled:opacity-60">
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Loaded users" value={users.length} />
          <MetricCard label="Competition streams" value={streams.length} />
          <MetricCard label="Restricted accounts" value={users.filter((user) => user.isBanned).length} tone="red" />
        </section>

        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p>}
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className={panelClass}>
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Moderation</p>
                <h2 className="mt-1 text-2xl font-black text-navy">Accounts, points, bans & passwords</h2>
              </div>
              <form action={() => loadAdminData(query)} className="flex w-full gap-2 lg:w-[420px]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Search email or display name" />
                <button disabled={isPending} className={`${buttonClass} bg-navy`}>Search</button>
              </form>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 pr-4">User</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Exact</th>
                    <th className="px-4 py-3">Outcomes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="py-3 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} disabled={isPending} onUpdate={updateUser} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            {admin.isSuperAdmin && (
              <div className={panelClass}>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Admin access</p>
                <h2 className="mt-1 text-2xl font-black text-navy">Create admin account</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">This uses a separate admin login and never shares player credentials.</p>
                <form action={createAdminAccount} className="mt-5 space-y-3">
                  <input name="username" required className={inputClass} placeholder="admin username" />
                  <input name="displayName" required className={inputClass} placeholder="Display name" />
                  <input name="password" required minLength={8} type="password" className={inputClass} placeholder="Password" />
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input name="isSuperAdmin" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                    Super admin privileges
                  </label>
                  <button disabled={isPending} className={`${buttonClass} w-full bg-indigo-600`}>Create admin</button>
                </form>
                <div className="mt-5 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {admins.map((account) => (
                    <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="font-black text-navy">{account.displayName}</p>
                      <p className="text-xs font-bold text-slate-500">{account.username} · {account.isSuperAdmin ? "Super admin" : "Admin"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Streams</p>
              <h2 className="mt-1 text-2xl font-black text-navy">Create competition stream</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Add Premier League, LaLiga, or another stream users can select in Match Center.</p>
              <form action={createStream} className="mt-5 space-y-3">
                <input name="name" required className={inputClass} placeholder="Premier League" />
                <input name="startsAt" required type="datetime-local" className={inputClass} />
                <input name="endsAt" type="datetime-local" className={inputClass} />
                <input name="hostCountries" className={inputClass} placeholder="England, Spain (optional)" />
                <button disabled={isPending} className={`${buttonClass} w-full bg-emerald-600`}>Create stream</button>
              </form>
              <div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1">
                {streams.map((stream) => (
                  <div key={stream.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-black text-navy">{stream.name}</p>
                    <p className="text-xs font-bold text-slate-500">{stream.slug} · {stream.isActive ? "Visible" : "Hidden"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={panelClass}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Matches</p>
              <h2 className="mt-1 text-2xl font-black text-navy">Match operations</h2>
              <form action={overrideScore} className="mt-5 grid gap-3 sm:grid-cols-[1fr_90px_90px]">
                <input name="matchId" className={inputClass} placeholder="Match ID" type="number" required />
                <input name="homeScore" className={inputClass} placeholder="Home" type="number" min="0" required />
                <input name="awayScore" className={inputClass} placeholder="Away" type="number" min="0" required />
                <button disabled={isPending} className={`${buttonClass} bg-red-600 sm:col-span-3`}>Override final score</button>
              </form>
              <form action={toggleMatch} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                <input name="matchId" className={inputClass} placeholder="Match ID" type="number" required />
                <select name="isEnabled" className={inputClass} defaultValue="false">
                  <option value="false">Disable match</option>
                  <option value="true">Enable match</option>
                </select>
                <button disabled={isPending} className={`${buttonClass} bg-navy sm:col-span-2`}>Update availability</button>
              </form>
              <form action={recalculate} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input name="matchId" className={inputClass} placeholder="Match ID" type="number" required />
                <button disabled={isPending} className={`${buttonClass} bg-slate-800`}>Recalculate points</button>
              </form>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AdminLogin({ onLogin }: { onLogin: (admin: AdminSession) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function login(formData: FormData) {
    setError(null);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    startTransition(async () => {
      try {
        const data = await adminJson<{ admin: AdminSession }>("/api/admin/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password })
        });
        onLogin(data.admin);
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : "Could not sign in");
      }
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white">
            <PlatformLogo className="h-12 w-12" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Admin only</p>
            <h1 className="text-3xl font-black text-navy">Admin Console</h1>
          </div>
        </div>
        <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Use the separate admin username and password. Player accounts cannot sign in here.
        </p>
        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <form action={login} className="mt-6 space-y-4">
          <input name="username" className={inputClass} autoComplete="username" placeholder="Admin username" required />
          <input name="password" className={inputClass} autoComplete="current-password" placeholder="Admin password" type="password" required />
          <button disabled={isPending} className={`${buttonClass} w-full bg-navy`}>{isPending ? "Signing in…" : "Sign in to admin"}</button>
        </form>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone = "navy" }: { label: string; value: number; tone?: "navy" | "red" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className={`mt-3 text-4xl font-black ${tone === "red" ? "text-red-600" : "text-navy"}`}>{value}</p>
    </div>
  );
}

function UserRow({ user, disabled, onUpdate }: { user: AdminUser; disabled: boolean; onUpdate: (id: string, payload: Record<string, unknown>, success: string) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [globalPoints, setGlobalPoints] = useState(String(user.globalPoints));
  const [exactScoresCount, setExactScoresCount] = useState(String(user.exactScoresCount));
  const [correctOutcomesCount, setCorrectOutcomesCount] = useState(String(user.correctOutcomesCount));
  const [banReason, setBanReason] = useState(user.banReason ?? "");
  const [password, setPassword] = useState("");

  return (
    <tr className="align-top">
      <td className="py-4 pr-4">
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} placeholder="Display name" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} className={`${inputClass} mt-2`} placeholder="Email" />
        {user.isAdmin && <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">Legacy admin</span>}
      </td>
      <td className="px-4 py-4"><input value={globalPoints} onChange={(event) => setGlobalPoints(event.target.value)} className={inputClass} type="number" /></td>
      <td className="px-4 py-4"><input value={exactScoresCount} onChange={(event) => setExactScoresCount(event.target.value)} className={inputClass} type="number" min="0" /></td>
      <td className="px-4 py-4"><input value={correctOutcomesCount} onChange={(event) => setCorrectOutcomesCount(event.target.value)} className={inputClass} type="number" min="0" /></td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{user.isBanned ? "Banned" : "Active"}</span>
        <textarea value={banReason} onChange={(event) => setBanReason(event.target.value)} className={`${inputClass} mt-3 min-h-20`} placeholder="Ban reason" />
      </td>
      <td className="py-4 pl-4">
        <div className="grid min-w-[260px] gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdate(user.id, { displayName, email, globalPoints: Number(globalPoints), exactScoresCount: Number(exactScoresCount), correctOutcomesCount: Number(correctOutcomesCount) }, "User details updated.")}
            className={`${buttonClass} bg-indigo-600`}
          >
            Save details & points
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdate(user.id, { isBanned: !user.isBanned, banReason: user.isBanned ? null : banReason }, user.isBanned ? "User restriction removed." : "User restricted.")}
            className={`${buttonClass} ${user.isBanned ? "bg-emerald-600" : "bg-red-600"}`}
          >
            {user.isBanned ? "Unban user" : "Ban user"}
          </button>
          <input value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="New password" type="password" />
          <button
            type="button"
            disabled={disabled || password.length < 8}
            onClick={() => { onUpdate(user.id, { password }, "Password reset."); setPassword(""); }}
            className={`${buttonClass} bg-slate-800`}
          >
            Reset password
          </button>
        </div>
      </td>
    </tr>
  );
}
