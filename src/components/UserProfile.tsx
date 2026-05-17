"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"profile" | "settings" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  function logout() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setError("Could not log out. Please try again.");
        return;
      }

      setIsOpen(false);
      setActiveSection(null);
      setUser(null);
      router.replace("/");
      router.refresh();
    });
  }

  const initials = getInitials(user.displayName, user.email);

  return (
    <div ref={menuRef} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Open profile menu"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-navy shadow-lg shadow-emerald-950/20 ring-2 ring-white/25 transition hover:bg-emerald-200 active:scale-95"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-40 w-72 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl shadow-emerald-950/25 ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-navy to-indigo-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-navy shadow-lg shadow-emerald-950/20">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">My profile</p>
                <p className="truncate text-base font-black text-white">{user.displayName}</p>
                {user.email && <p className="truncate text-xs font-semibold text-slate-200">{user.email}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3">
            <button
              type="button"
              onClick={() => setActiveSection((current) => (current === "profile" ? null : "profile"))}
              aria-expanded={activeSection === "profile"}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-900 transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              <span>See profile details</span>
              <span aria-hidden="true" className="text-emerald-600">
                {activeSection === "profile" ? "−" : "+"}
              </span>
            </button>
            {activeSection === "profile" && (
              <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-950">
                <p>Display name: {user.displayName}</p>
                <p className="mt-1">Email: {user.email || "Not added"}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveSection((current) => (current === "settings" ? null : "settings"))}
              aria-expanded={activeSection === "settings"}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-900 transition hover:bg-indigo-50 active:scale-[0.99]"
            >
              <span>Settings</span>
              <span aria-hidden="true" className="text-indigo-600">
                {activeSection === "settings" ? "−" : "+"}
              </span>
            </button>
            {activeSection === "settings" && (
              <div className="rounded-2xl bg-indigo-50 px-3 py-3 text-xs font-bold text-indigo-950">
                <p>Onboarding: {user.onboardingCompleted ? "Completed" : "Needs setup"}</p>
                <p className="mt-1 text-indigo-700">More account settings can be added here.</p>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              disabled={isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-navy px-3 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-indigo-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isPending ? "Logging out…" : "Log out"}
            </button>
            {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
