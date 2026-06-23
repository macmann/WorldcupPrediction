"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type PredictDateTabItem = {
  date: string;
  label: string;
  matchCount: number;
};

type PredictDateTabsProps = {
  dates: PredictDateTabItem[];
  selectedDate: string | undefined;
  streamParam: string;
  emptyLabel: string;
};

export function PredictDateTabs({ dates, selectedDate, streamParam, emptyLabel }: PredictDateTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const scrollSelectedDateIntoView = () => {
      selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    };

    scrollSelectedDateIntoView();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (container.offsetParent !== null) scrollSelectedDateIntoView();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [selectedDate]);

  return (
    <div ref={containerRef} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {dates.length ? (
        dates.map((tabDate) => {
          const isActive = tabDate.date === selectedDate;

          return (
            <Link
              key={tabDate.date}
              ref={isActive ? selectedRef : undefined}
              href={`/predict?date=${encodeURIComponent(tabDate.date)}${streamParam}`}
              aria-current={isActive ? "date" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold shadow-sm ${isActive ? "bg-navy text-white" : "bg-white text-slate-700"}`}
            >
              {tabDate.label} <span className={isActive ? "text-white/70" : "text-slate-400"}>({tabDate.matchCount})</span>
            </Link>
          );
        })
      ) : (
        <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm">{emptyLabel}</span>
      )}
    </div>
  );
}
