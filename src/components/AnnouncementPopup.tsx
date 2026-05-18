"use client";

import { useEffect, useState } from "react";

type PopupAnnouncement = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
};

const defaultDateKey = () => new Date().toISOString().slice(0, 10);

function storageKey(dateKey: string) {
  return `ffm-announcement-seen:${dateKey}`;
}

function markSeen(id: string, dateKey: string) {
  try {
    window.localStorage.setItem(storageKey(dateKey), new Date().toISOString());
  } catch {
    // Local storage may be unavailable in private browsing; server-side seen state still protects users.
  }
  fetch(`/api/announcements/${id}/seen`, { method: "POST" }).catch(() => undefined);
}

export function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<PopupAnnouncement | null>(null);
  const [showDate, setShowDate] = useState(defaultDateKey);

  useEffect(() => {
    let mounted = true;
    fetch("/api/announcements/active", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!mounted || !data?.announcement) return;
        const responseDateKey = typeof data.showDate === "string" ? data.showDate : defaultDateKey();
        try {
          if (window.localStorage.getItem(storageKey(responseDateKey))) return;
        } catch {
          // Ignore storage failures and let the popup render from the authenticated API response.
        }
        setShowDate(responseDateKey);
        setAnnouncement(data.announcement);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  if (!announcement) return null;

  function closePopup() {
    if (announcement) markSeen(announcement.id, showDate);
    setAnnouncement(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-2xl ring-1 ring-white/20">
        <div className="relative bg-slate-100">
          <img src={announcement.imageUrl} alt="" className="h-56 w-full object-cover" />
          <button type="button" onClick={closePopup} className="absolute right-4 top-4 rounded-full bg-slate-950/70 px-3 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-950" aria-label="Close announcement">Close</button>
        </div>
        <div className="p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Announcement</p>
          <h2 id="announcement-title" className="mt-2 text-2xl font-black text-navy">{announcement.title}</h2>
          <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{announcement.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={closePopup} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Close</button>
            <a href={announcement.linkUrl} onClick={closePopup} className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-emerald-700">See more</a>
          </div>
        </div>
      </section>
    </div>
  );
}
