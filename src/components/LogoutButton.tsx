"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export function LogoutButton() {
  const { t, setUser } = useStore();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      setUser(null);
      router.replace("/");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <div className="shrink-0">
    <button type="button" onClick={() => void logout()} disabled={pending} className="min-h-11 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">
      {pending ? t("auth.loggingOut") : t("auth.logout")}
    </button>
    {error && <p role="alert" className="mt-2 max-w-40 text-xs text-red-700">{t("auth.logoutError")}</p>}
  </div>;
}
