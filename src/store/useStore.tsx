"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type UserSession = {
  id?: string;
  email?: string;
  displayName: string;
  onboardingCompleted: boolean;
};

export type OptimisticPrediction = {
  matchId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
};

type AppStore = {
  user: UserSession | null;
  predictions: Record<number, OptimisticPrediction>;
  setUser: (user: UserSession | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setOptimisticPrediction: (prediction: Omit<OptimisticPrediction, "status"> & { status?: OptimisticPrediction["status"] }) => void;
  markPredictionStatus: (matchId: number, status: OptimisticPrediction["status"], error?: string) => void;
};

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [predictions, setPredictions] = useState<Record<number, OptimisticPrediction>>({});

  const setUser = useCallback((nextUser: UserSession | null) => setUserState(nextUser), []);

  const setOnboardingCompleted = useCallback((completed: boolean) => {
    setUserState((current) => ({ ...(current ?? { displayName: "You" }), onboardingCompleted: completed }));
  }, []);

  const setOptimisticPrediction = useCallback<AppStore["setOptimisticPrediction"]>((prediction) => {
    setPredictions((current) => ({
      ...current,
      [prediction.matchId]: {
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

  const value = useMemo(() => ({ user, predictions, setUser, setOnboardingCompleted, setOptimisticPrediction, markPredictionStatus }), [markPredictionStatus, predictions, setOnboardingCompleted, setOptimisticPrediction, setUser, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}
