"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BallIcon, HistoryIcon, HomeIcon, TrophyIcon, UsersIcon } from "@/components/Icons";

const tabs = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/winners", label: "Winners", icon: TrophyIcon },
  { href: "/predict", label: "Predict", icon: BallIcon },
  { href: "/leagues", label: "Leagues", icon: UsersIcon },
  { href: "/history", label: "History", icon: HistoryIcon }
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-slate-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid grid-cols-5 gap-1 text-center text-[11px] font-black text-slate-500">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={`group relative rounded-2xl px-2 py-2 transition active:scale-95 ${active ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 hover:text-indigo-700"}`}>
              {active && <span className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-500" />}
              <span aria-hidden="true" className="block">
                <Icon className={`mx-auto mb-1 h-5 w-5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
