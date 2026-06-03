"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { PlatformLogo } from "@/components/Icons";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginBackgroundImageUrl, setLoginBackgroundImageUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!mounted) return;
        if (data?.user) {
          setUser(data.user);
          router.replace("/dashboard");
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => { mounted = false; };
  }, [router, setUser]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!mounted) return;
        setLoginBackgroundImageUrl(data?.loginBackgroundImageUrl ?? null);
      })
      .catch(() => {
        if (mounted) setLoginBackgroundImageUrl(null);
      });
    return () => { mounted = false; };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not sign in");
        setUser(data.user);
        router.push("/dashboard");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not sign in");
      }
    });
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(20,184,166,0.22),transparent_34%),linear-gradient(155deg,#041427_0%,#062c31_48%,#02131d_100%)] p-4 text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-200/40 border-t-emerald-400 animate-spin" />
            <span className="absolute inset-2 rounded-full bg-white/10 animate-pulse" />
            <PlatformLogo className="relative h-14 w-14 animate-pulse drop-shadow-[0_0_20px_rgba(52,211,153,0.45)]" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-200">Loading</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="login-premium-bg relative min-h-dvh overflow-hidden px-5 pb-8 pt-3 text-white"
      style={loginBackgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(2, 10, 24, 0.72), rgba(2, 22, 29, 0.84)), url(${loginBackgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-emerald-400/18 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-60 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_22%,rgba(255,255,255,0.2)_0_1px,transparent_2px),radial-gradient(circle_at_78%_18%,rgba(167,243,208,0.2)_0_1px,transparent_2px),radial-gradient(circle_at_66%_72%,rgba(255,255,255,0.16)_0_1px,transparent_2px)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.75rem)] max-w-sm flex-col">
        <div className="flex items-center justify-between px-1 py-2 text-[13px] font-bold tracking-tight text-white/95">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-white/90" aria-hidden="true">
            <span className="flex h-3.5 items-end gap-0.5">
              <span className="h-1.5 w-0.5 rounded-full bg-current" />
              <span className="h-2 w-0.5 rounded-full bg-current" />
              <span className="h-2.5 w-0.5 rounded-full bg-current" />
              <span className="h-3 w-0.5 rounded-full bg-current" />
            </span>
            <svg className="h-3.5 w-4" viewBox="0 0 18 14" fill="none"><path d="M1 5.7C5.6 1.9 12.4 1.9 17 5.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M4.2 8.9C7 6.7 11 6.7 13.8 8.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M7.5 11.8C8.4 11.1 9.6 11.1 10.5 11.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
            <span className="relative h-3.5 w-6 rounded-[4px] border border-white/80 p-0.5">
              <span className="block h-full w-4 rounded-[2px] bg-white" />
              <span className="absolute -right-1 top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-r bg-white/80" />
            </span>
          </div>
        </div>

        <section className="mt-9 flex flex-col items-center text-center">
          <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(4,31,35,0.35))] shadow-[0_22px_60px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md">
            <span className="absolute inset-2 rounded-[1.55rem] border border-emerald-200/15 bg-[radial-gradient(circle_at_50%_10%,rgba(252,211,77,0.22),transparent_28%),linear-gradient(160deg,rgba(120,53,15,0.34),rgba(6,95,70,0.24))]" />
            <span className="absolute -top-2 h-7 w-7 rotate-45 rounded bg-amber-300/90 shadow-[0_0_22px_rgba(251,191,36,0.45)]" />
            <PlatformLogo className="relative h-24 w-24 drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]" />
          </div>
          <p className="mt-5 bg-[linear-gradient(92deg,#f8fafc_0%,#94a3b8_38%,#ffffff_55%,#64748b_100%)] bg-clip-text text-sm font-black uppercase tracking-[0.42em] text-transparent drop-shadow-[0_2px_12px_rgba(255,255,255,0.16)]">FFM - WC2026</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-white">Sign in first</h1>
          <p className="mt-4 max-w-[20rem] text-sm font-semibold leading-6 text-emerald-50/88">Log in to unlock your dashboard, make match predictions, and choose your Champion, Best Player, and Best Goalkeeper.</p>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/12 bg-slate-950/42 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-[13px] font-black uppercase tracking-[0.14em] text-slate-100/90">Email
              <span className="mt-2 flex items-center gap-3 rounded-[1.35rem] border border-teal-300/35 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(17,94,89,0.24)),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_5px)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition focus-within:border-teal-200/85 focus-within:shadow-[0_0_28px_rgba(45,212,191,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <svg className="h-4 w-4 shrink-0 text-teal-100/48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" className="min-w-0 flex-1 bg-transparent text-base font-bold normal-case tracking-normal text-white placeholder:text-slate-300/42" />
              </span>
            </label>
            <label className="block text-[13px] font-black uppercase tracking-[0.14em] text-slate-100/90">Password
              <span className="mt-2 flex items-center gap-3 rounded-[1.35rem] border border-teal-300/35 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(17,94,89,0.24)),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_5px)] px-4 py-3.5 shadow-[0_0_34px_rgba(45,212,191,0.14),inset_0_1px_0_rgba(255,255,255,0.09)] transition focus-within:border-teal-200/85 focus-within:shadow-[0_0_30px_rgba(45,212,191,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <svg className="h-4 w-4 shrink-0 text-teal-100/48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Password" className="min-w-0 flex-1 bg-transparent text-base font-bold normal-case tracking-normal text-white placeholder:text-slate-300/42" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-teal-50/72 transition hover:bg-white/10" aria-label={showPassword ? "Hide password" : "Show password"}>
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{showPassword ? null : <path d="m4 4 16 16"/>}</svg>
                </button>
              </span>
            </label>
            <div className="text-right text-sm font-bold"><Link href="/forgot-password" className="text-[#c4b5fd] transition hover:text-violet-200">Forgot password?</Link></div>
            {error && <p className="rounded-2xl border border-red-300/30 bg-red-500/14 p-3 text-sm font-bold text-red-100">{error}</p>}
            <button disabled={isPending} className="group mt-1 flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-[linear-gradient(135deg,#22c55e_0%,#059669_55%,#047857_100%)] py-4 font-black text-white shadow-[0_18px_34px_rgba(5,150,105,0.34),inset_0_1px_0_rgba(255,255,255,0.26)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55">
              <span>{isPending ? "Signing in…" : "Sign in"}</span>
              <svg className="h-4 w-4 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          </form>
          <p className="mt-5 text-center text-sm font-semibold text-slate-200/76">No account yet? <Link href="/signup" className="font-black text-[#c4b5fd] transition hover:text-violet-200">Create one</Link></p>
        </section>
      </div>
    </main>
  );
}
