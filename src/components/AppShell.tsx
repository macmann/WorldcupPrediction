"use client";
import { useCallback, useEffect, useRef } from "react";
import { CompetitionSelector } from "@/components/CompetitionSelector";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { BallIcon } from "@/components/Icons";
import { UserProfile } from "@/components/UserProfile";
import { LogoutButton } from "@/components/LogoutButton";
import { AnnouncementBanner } from "@/components/SystemStatusGate";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { useStore } from "@/store/useStore";

export function AppShell({ children, title, eyebrow }: { children: React.ReactNode; title?: string; eyebrow?: string }) {
  const { t } = useStore();
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const attachHeader = useCallback((node: HTMLElement | null) => {
    resizeObserver.current?.disconnect();
    if (!node) return;
    const measure = () => document.documentElement.style.setProperty("--season-header-height", `${node.getBoundingClientRect().height}px`);
    measure();
    resizeObserver.current = new ResizeObserver(measure);
    resizeObserver.current.observe(node);
  }, []);
  useEffect(() => () => resizeObserver.current?.disconnect(), []);
  return <AuthGate><div className="season-shell">
    <AnnouncementPopup />
    <header ref={attachHeader} className="season-header"><div className="season-header-inner">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="brand-mark"><BallIcon className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">{t("platform.title")}</p><h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-navy">{title ?? t("platform.title")}</h1></div></div><div className="ml-auto flex items-center gap-2"><UserProfile /><LogoutButton /></div></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{eyebrow ?? t("ui.seasonSocial")}</p><CompetitionSelector /></div>
      <BottomNav desktop />
    </div></header>
    <AnnouncementBanner />
    <main className="season-content">{children}</main>
    <BottomNav />
  </div></AuthGate>;
}
