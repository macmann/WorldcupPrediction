"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { Card } from "@/components/Cards";
import { PlatformLogo } from "@/components/Icons";
import { useStore } from "@/store/useStore";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useStore();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not reset password");
      setUser(data.user);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset password");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 py-8 text-white">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-emerald-950/30 ring-1 ring-white/15">
          <PlatformLogo className="h-14 w-14" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">New password</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Choose a password</h1>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-50">Create a new password for your FFM - WC2026 account.</p>

      <Card className="mt-8 text-slate-950">
        {!token ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">This reset link is missing a token. Request a new password reset link.</p>
            <Link href="/forgot-password" className="block w-full rounded-2xl bg-emerald-600 py-4 text-center font-black text-white shadow-lg shadow-emerald-600/20">Request reset link</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-black">New password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
            </label>
            <label className="block text-sm font-black">Confirm password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
            </label>
            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            <button disabled={isSubmitting} aria-busy={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">{isSubmitting ? <ButtonSpinner /> : null}<span>{isSubmitting ? "Resetting password…" : "Reset password"}</span></button>
          </form>
        )}
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">Need to sign in? <Link href="/" className="font-black text-indigo-700">Back to sign in</Link></p>
      </Card>
    </main>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-gradient-to-b from-navy to-emerald-950 p-4 text-white"><p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-200">Loading reset link</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
