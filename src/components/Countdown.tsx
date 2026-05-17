"use client";

import { useEffect, useMemo, useState } from "react";

function parts(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return [
    { label: "Days", value: Math.floor(diff / 86_400_000) },
    { label: "Hours", value: Math.floor(diff / 3_600_000) % 24 },
    { label: "Min", value: Math.floor(diff / 60_000) % 60 },
    { label: "Sec", value: Math.floor(diff / 1_000) % 60 }
  ];
}

export function Countdown({ target }: { target: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const values = useMemo(() => parts(target), [target, tick]);

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {values.map((part) => (
        <div key={part.label} className="rounded-2xl bg-white/15 p-3 backdrop-blur motion-safe:animate-pulse">
          <p className="text-2xl font-black">{String(part.value).padStart(2, "0")}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-100">{part.label}</p>
        </div>
      ))}
    </div>
  );
}
