"use client";

import { usePathname } from "next/navigation";

export function ViewportFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktopAdmin = pathname.startsWith("/admin-console");

  if (isDesktopAdmin) {
    return <div className="min-h-dvh w-full bg-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-slate-200 md:flex md:items-stretch md:justify-center">
      <div className="mobile-app relative h-dvh w-full max-w-[400px] overflow-y-auto overflow-x-hidden border-x border-slate-300 bg-slate-50 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
