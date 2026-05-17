"use client";

import { useMemo, useState } from "react";

type DailyShareActionsProps = {
  text: string;
  date: string;
};

export function DailyShareActions({ text, date }: DailyShareActionsProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/daily?date=${date}`;
    return `${window.location.origin}/daily?date=${date}`;
  }, [date]);

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(shareUrl);

  async function shareNative() {
    const payload = { title: "FFM WC2026 Daily Winner", text, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={shareNative} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition active:scale-[0.98]">
        {status === "copied" ? "Copied share text" : status === "error" ? "Use a social button below" : "Share my daily score"}
      </button>
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
        <a className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-700" href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`} target="_blank" rel="noreferrer">X</a>
        <a className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-700" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`} target="_blank" rel="noreferrer">Facebook</a>
        <a className="rounded-2xl bg-slate-100 px-3 py-2 text-slate-700" href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noreferrer">WhatsApp</a>
      </div>
    </div>
  );
}
