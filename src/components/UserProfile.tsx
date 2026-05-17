"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useStore } from "@/store/useStore";

function getInitials(displayName?: string, email?: string) {
  const source = displayName?.trim() || email?.trim() || "You";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function UserProfile() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  function logout() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setError("Could not log out. Please try again.");
        return;
      }

      setUser(null);
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-3xl bg-white/10 p-3 ring-1 ring-white/15">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-navy shadow-lg shadow-emerald-950/20">
          {getInitials(user.displayName, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">My profile</p>
          <p className="truncate text-sm font-black text-white">{user.displayName}</p>
          {user.email && <p className="truncate text-xs font-semibold text-slate-200">{user.email}</p>}
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={isPending}
          className="shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-black text-navy shadow-lg shadow-emerald-950/20 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isPending ? "Logging out…" : "Log out"}
        </button>
      </div>
      {error && <p className="mt-2 rounded-2xl bg-red-500/20 px-3 py-2 text-xs font-bold text-red-100">{error}</p>}
    </div>
  );
}
