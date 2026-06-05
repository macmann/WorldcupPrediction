"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ButtonSpinner } from "@/components/ButtonSpinner";
import { Card } from "@/components/Cards";
import { PlatformLogo } from "@/components/Icons";
import { useStore } from "@/store/useStore";

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, phone, password })
      });
      const data = await response.json();
      if (!response.ok) {
        const fieldError = data.details?.fieldErrors?.phone?.[0];
        throw new Error(fieldError ?? data.error ?? "Could not create account");
      }
      setUser(data.user);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create account");
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
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Create account</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Join FFM - WC2026</h1>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-emerald-50">Sign up once, then continue to the dashboard to enter your tournament winner picks.</p>

      <Card className="mt-8 text-slate-950">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-black">Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={60} autoComplete="name" disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
          </label>
          <label className="block text-sm font-black">Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
          </label>
          <label className="block text-sm font-black">Phone number
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="numeric" pattern="09[0-9]{7,9}" minLength={9} maxLength={11} autoComplete="tel" title="Phone number must start with 09 and contain 9 to 11 digits." disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
          </label>
          <label className="block text-sm font-black">Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={isSubmitting} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 font-bold disabled:cursor-not-allowed disabled:bg-slate-100" />
          </label>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <button disabled={isSubmitting} aria-busy={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">{isSubmitting ? <ButtonSpinner /> : null}<span>{isSubmitting ? "Creating account…" : "Create account"}</span></button>
        </form>
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">Already signed up? <Link href="/" className="font-black text-indigo-700">Sign in</Link></p>
      </Card>
    </main>
  );
}
