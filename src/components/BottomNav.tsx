"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BallIcon, HistoryIcon, HomeIcon, UsersIcon } from "@/components/Icons";
import { useStore } from "@/store/useStore";

const tabs = [
  { href: "/dashboard", labelKey: "nav.home", icon: HomeIcon },
  { href: "/predict", labelKey: "nav.predict", icon: BallIcon },
  { href: "/winners", labelKey: "nav.winners", icon: WC26Icon },
  { href: "/leagues", labelKey: "nav.leagues", icon: UsersIcon },
  { href: "/history", labelKey: "nav.history", icon: HistoryIcon }
] as const;

function WC26Icon({ className }: { className?: string }) {
  return (
    <img
      src="https://i.ibb.co/Q7pgQJ6R/viber-image-2026-06-01-14-13-33-275.jpg"
      alt=""
      className={`rounded-md object-cover ${className ?? ""}`}
      loading="lazy"
    />
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/history" && pathname.startsWith("/daily"));
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useStore();

  return (
    <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[400px] px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_-10px_34px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-center gap-1 text-center text-[10px] font-black leading-tight text-slate-500">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-[3.6rem] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-1.5 py-2 transition active:scale-95 ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "hover:bg-slate-50 hover:text-indigo-700"}`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
                <span className="flex h-6 items-center justify-center text-center">{t(tab.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
