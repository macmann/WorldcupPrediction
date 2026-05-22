"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PlatformLogo } from "@/components/Icons";

type PublicSettings = {
  announcementText?: string | null;
  bannerImageUrl?: string | null;
  maintenanceMode?: boolean;
};

export function SystemStatusGate({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (mounted) setSettings(data); })
      .catch(() => { if (mounted) setSettings({ maintenanceMode: false }); });
    return () => { mounted = false; };
  }, []);

  if (settings?.maintenanceMode && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-center text-slate-900 shadow-2xl">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-white">
            <PlatformLogo className="h-14 w-14" />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Maintenance mode</p>
          <h1 className="mt-2 text-3xl font-black text-navy">We’ll be right back</h1>
          <p className="mt-3 text-sm font-semibold text-slate-500">The tournament platform is temporarily offline while administrators perform scheduled updates.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [banner, setBanner] = useState<{ announcementText: string | null; bannerImageUrl: string | null }>({ announcementText: null, bannerImageUrl: null });

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (mounted) {
          setBanner({ announcementText: data?.announcementText ?? null, bannerImageUrl: data?.bannerImageUrl ?? null });
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  if (pathname !== "/dashboard") return null;

  if (banner.bannerImageUrl) {
    return (
      <div className="bg-slate-100 px-4 py-3">
        <img src={banner.bannerImageUrl} alt="Homepage banner" className="mx-auto w-full max-w-6xl rounded-2xl object-cover" />
      </div>
    );
  }
  if (!banner.announcementText) return null;
  return <div className="bg-amber-100 px-4 py-3 text-center text-sm font-black text-amber-900">{banner.announcementText}</div>;
}
