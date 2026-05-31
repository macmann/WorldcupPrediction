"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { Card } from "@/components/Cards";
import { PlatformLogo } from "@/components/Icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not send reset link");
        setMessage(data.message ?? "If an account exists for that email, a password reset link will be sent shortly.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not send reset link");
      }
    });
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 py-8 text-white">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-emerald-950/30 ring-1 ring-white/15">
          <PlatformLogo className="h-14 w-14" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Password help</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Reset your password</h1>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-50">Enter your account email and we’ll send a secure password reset link.</p>

      <Card className="mt-8 text-slate-950">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-black">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          {message && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={isPending} className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Sending link…" : "Send reset link"}</button>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">Remembered it? <Link href="/" className="font-black text-indigo-700">Back to sign in</Link></p>
      </Card>
    </main>
  );
}
