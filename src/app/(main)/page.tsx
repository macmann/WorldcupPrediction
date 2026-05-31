"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { Card } from "@/components/Cards";
import { PlatformLogo } from "@/components/Icons";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-navy to-emerald-950 p-4 text-white">
        <div className="flex flex-col items-center gap-5">
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-200/40 border-t-emerald-400 animate-spin" />
            <span className="absolute inset-2 rounded-full bg-white/10 animate-pulse" />
            <PlatformLogo className="relative h-14 w-14 animate-pulse" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-200">Loading</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 py-8 text-white"
      style={loginBackgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.62), rgba(2, 6, 23, 0.78)), url(${loginBackgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-emerald-950/30 ring-1 ring-white/15">
          <PlatformLogo className="h-14 w-14" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">FFM - WC2026</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Sign in first</h1>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-50">Log in to unlock your dashboard, make match predictions, and choose your Champion, Best Player, and Best Goalkeeper.</p>

      <Card className="mt-8 text-slate-950">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-black">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          <label className="block text-sm font-black">Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          <div className="text-right text-sm font-semibold"><Link href="/forgot-password" className="font-black text-indigo-700">Forgot password?</Link></div>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={isPending} className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">No account yet? <Link href="/signup" className="font-black text-indigo-700">Create one</Link></p>
      </Card>
    </main>
  );
}
