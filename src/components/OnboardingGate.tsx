"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SkeletonCard } from "@/components/Cards";
import { useStore } from "@/store/useStore";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setOnboardingCompleted } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const persisted = window.localStorage.getItem("worldcup:onboarding-completed") === "true";
    if (persisted) setOnboardingCompleted(true);
    setReady(true);
  }, [setOnboardingCompleted]);

  useEffect(() => {
    if (!ready || pathname === "/onboarding") return;
    const completed = user?.onboardingCompleted || window.localStorage.getItem("worldcup:onboarding-completed") === "true";
    if (!completed) router.replace("/onboarding");
  }, [pathname, ready, router, user?.onboardingCompleted]);

  if (!ready || (!user?.onboardingCompleted && pathname !== "/onboarding")) {
    return <main className="space-y-4 p-4"><SkeletonCard /><SkeletonCard lines={2} /></main>;
  }

  return <>{children}</>;
}
