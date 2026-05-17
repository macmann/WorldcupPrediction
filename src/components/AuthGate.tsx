"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SkeletonCard } from "@/components/Cards";
import { useStore } from "@/store/useStore";

const publicPaths = new Set(["/", "/signup"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (publicPaths.has(pathname)) {
      setReady(true);
      return;
    }

    let mounted = true;
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!mounted) return;
        if (data?.user) {
          setUser(data.user);
          setReady(true);
        } else {
          setUser(null);
          router.replace("/");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        router.replace("/");
      });

    return () => { mounted = false; };
  }, [pathname, router, setUser]);

  if (!ready || (!user && !publicPaths.has(pathname))) {
    return <main className="space-y-4 p-4"><SkeletonCard /><SkeletonCard lines={2} /></main>;
  }

  return <>{children}</>;
}
