"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Card } from "@/components/Cards";
import { useStore } from "@/store/useStore";

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not create account");
        setUser(data.user);
        router.push("/dashboard");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create account");
      }
    });
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-navy to-emerald-950 px-4 py-8 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Create account</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Join WC Predictor</h1>
      <p className="mt-3 text-sm font-medium text-emerald-50">Sign up once, then continue to the dashboard to enter your tournament winner picks.</p>

      <Card className="mt-8 text-slate-950">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-black">Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={60} autoComplete="name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          <label className="block text-sm font-black">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          <label className="block text-sm font-black">Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold" />
          </label>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={isPending} className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:bg-slate-300">{isPending ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">Already signed up? <Link href="/" className="font-black text-indigo-700">Sign in</Link></p>
      </Card>
    </main>
  );
}
