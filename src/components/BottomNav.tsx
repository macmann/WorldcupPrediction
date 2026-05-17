"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HistoryIcon, HomeIcon, TrophyIcon, UsersIcon } from "@/components/Icons";

const tabs = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/predict", label: "Predict", icon: TrophyIcon },
  { href: "/leagues", label: "Leagues", icon: UsersIcon },
  { href: "/history", label: "History", icon: HistoryIcon }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid grid-cols-4 gap-1 text-center text-[11px] font-black text-slate-500">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={`group relative rounded-2xl px-2 py-2 transition active:scale-95 ${active ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 hover:text-indigo-700"}`}>
              {active && <motion.span layoutId="bottom-nav-active-pill" className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-emerald-500" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <motion.span aria-hidden="true" className="block" whileTap={{ scale: 0.88 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
                <Icon className={`mx-auto mb-1 h-5 w-5 ${active ? "text-emerald-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
              </motion.span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
