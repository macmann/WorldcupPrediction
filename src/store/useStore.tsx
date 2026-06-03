"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MatchOutcome } from "@/lib/frontendData";
import { defaultLocale, normalizeLocale, translate } from "@/lib/i18n";
import type { Locale, TranslationKey } from "@/lib/i18n";

export type UserSession = {
  id?: string;
  email?: string;
  displayName: string;
  onboardingCompleted: boolean;
  preferredLocale?: Locale;
};

export type OptimisticPrediction = {
  matchId: number;
  predictedOutcome?: MatchOutcome | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};

type AppStore = {
  user: UserSession | null;
  predictions: Record<number, OptimisticPrediction>;
  setUser: (user: UserSession | null) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  setOnboardingCompleted: (completed: boolean) => void;
  setOptimisticPrediction: (prediction: Omit<OptimisticPrediction, "status"> & { status?: OptimisticPrediction["status"] }) => void;
  markPredictionStatus: (matchId: number, status: OptimisticPrediction["status"], error?: string) => void;
};

const StoreContext = createContext<AppStore | null>(null);
const localeStorageKey = "worldcup:locale";

function persistLocalePreference(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localeStorageKey, locale);
  document.cookie = `worldcup_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [predictions, setPredictions] = useState<Record<number, OptimisticPrediction>>({});

  useEffect(() => {
    const storedLocale = normalizeLocale(window.localStorage.getItem(localeStorageKey));
    setLocaleState(storedLocale);
    persistLocalePreference(storedLocale);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    const normalizedLocale = normalizeLocale(nextLocale);
    setLocaleState(normalizedLocale);
    persistLocalePreference(normalizedLocale);
  }, []);

  const setUser = useCallback((nextUser: UserSession | null) => {
    setUserState(nextUser);
    if (nextUser?.preferredLocale) {
      const normalizedLocale = normalizeLocale(nextUser.preferredLocale);
      setLocaleState(normalizedLocale);
      persistLocalePreference(normalizedLocale);
    }
  }, []);

  const setOnboardingCompleted = useCallback((completed: boolean) => {
    setUserState((current) => ({ ...(current ?? { displayName: "You" }), onboardingCompleted: completed }));
  }, []);

  const setOptimisticPrediction = useCallback<AppStore["setOptimisticPrediction"]>((prediction) => {
    setPredictions((current) => ({
      ...current,
      [prediction.matchId]: {
        ...current[prediction.matchId],
        ...prediction,
        status: prediction.status ?? "saving"
      }
    }));
  }, []);

  const markPredictionStatus = useCallback<AppStore["markPredictionStatus"]>((matchId, status, error) => {
    setPredictions((current) => {
      const existing = current[matchId];
      if (!existing) return current;
      return { ...current, [matchId]: { ...existing, status, error } };
    });
  }, []);

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ user, locale, predictions, setUser, setLocale, t, setOnboardingCompleted, setOptimisticPrediction, markPredictionStatus }), [locale, markPredictionStatus, predictions, setLocale, setOnboardingCompleted, setOptimisticPrediction, setUser, t, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}
