"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { localeLabels, locales } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useStore } from "@/store/useStore";

type LegalContent = {
  gameRulesHtml?: string | null;
  termsConditionsHtml?: string | null;
};

function getInitials(displayName?: string, email?: string) {
  const source = displayName?.trim() || email?.trim() || "You";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function sanitizeContentHtml(html: string) {
  if (typeof window === "undefined") return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  document
    .querySelectorAll("script, iframe, object, embed, link, meta, style")
    .forEach((node) => node.remove());
  document.body.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on") || value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return document.body.innerHTML;
}

export function UserProfile() {
  const router = useRouter();
  const { user, locale, setLocale, setUser, t } = useStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "profile" | "gameRules" | "terms" | "settings" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [localeMessage, setLocaleMessage] = useState<string | null>(null);
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [legalContent, setLegalContent] = useState<LegalContent | null>(null);
  const [legalContentError, setLegalContentError] = useState<string | null>(
    null,
  );
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || legalContent) return;

    let mounted = true;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: LegalContent) => {
        if (!mounted) return;
        setLegalContent({
          gameRulesHtml: data.gameRulesHtml
            ? sanitizeContentHtml(data.gameRulesHtml)
            : null,
          termsConditionsHtml: data.termsConditionsHtml
            ? sanitizeContentHtml(data.termsConditionsHtml)
            : null,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setLegalContent({ gameRulesHtml: null, termsConditionsHtml: null });
        setLegalContentError(t("profile.contentLoadError"));
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, legalContent, t]);

  if (!user) return null;

  function updatePasswordField(
    field: keyof typeof passwordForm,
    value: string,
  ) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }

    setIsPasswordPending(true);
    void (async () => {
      try {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        });
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          setPasswordError(payload?.error || t("settings.passwordSaveError"));
          return;
        }

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordSuccess(t("settings.passwordSaved"));
      } finally {
        setIsPasswordPending(false);
      }
    })();
  }

  function updateLocalePreference(nextLocale: Locale) {
    setLocale(nextLocale);
    setLocaleMessage(null);
    setLocaleError(null);

    void (async () => {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLocale: nextLocale }),
      });

      if (!response.ok) {
        setLocaleError(t("settings.languageError"));
        return;
      }

      setLocaleMessage(t("settings.languageSaved"));
    })();
  }

  function logout() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setError(t("auth.logoutError"));
        return;
      }

      setIsOpen(false);
      setActiveSection(null);
      setUser(null);
      router.replace("/");
      router.refresh();
    });
  }

  const initials = getInitials(user.displayName, user.email);

  return (
    <div ref={menuRef} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={t("profile.openMenu")}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300 text-sm font-black text-navy shadow-lg shadow-emerald-950/20 ring-2 ring-white/25 transition hover:bg-emerald-200 active:scale-95"
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-40 flex max-h-[calc(100dvh-6rem)] w-72 flex-col overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl shadow-emerald-950/25 ring-1 ring-slate-200">
          <div className="shrink-0 bg-gradient-to-br from-navy to-indigo-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-navy shadow-lg shadow-emerald-950/20">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                  {t("profile.myProfile")}
                </p>
                <p className="truncate text-base font-black text-white">
                  {user.displayName}
                </p>
                {user.email && (
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {user.email}
                  </p>
                )}
                {user.phone && (
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {user.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() =>
                setActiveSection((current) =>
                  current === "profile" ? null : "profile",
                )
              }
              aria-expanded={activeSection === "profile"}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-900 transition hover:bg-emerald-50 active:scale-[0.99]"
            >
              <span>{t("profile.detailsToggle")}</span>
              <span aria-hidden="true" className="text-emerald-600">
                {activeSection === "profile" ? "−" : "+"}
              </span>
            </button>
            {activeSection === "profile" && (
              <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-950">
                <p>
                  {t("profile.displayName")}: {user.displayName}
                </p>
                <p className="mt-1">
                  {t("profile.email")}:{" "}
                  {user.email || t("profile.emailMissing")}
                </p>
                {user.phone && (
                  <p className="mt-1">Phone: {user.phone}</p>
                )}
              </div>
            )}
            <LegalContentSection
              section="gameRules"
              title={t("profile.gameRules")}
              expanded={activeSection === "gameRules"}
              html={legalContent?.gameRulesHtml}
              emptyText={t("profile.gameRulesEmpty")}
              error={legalContentError}
              onToggle={() =>
                setActiveSection((current) =>
                  current === "gameRules" ? null : "gameRules",
                )
              }
            />
            <LegalContentSection
              section="terms"
              title={t("profile.termsConditions")}
              expanded={activeSection === "terms"}
              html={legalContent?.termsConditionsHtml}
              emptyText={t("profile.termsConditionsEmpty")}
              error={legalContentError}
              onToggle={() =>
                setActiveSection((current) =>
                  current === "terms" ? null : "terms",
                )
              }
            />
            <button
              type="button"
              onClick={() =>
                setActiveSection((current) =>
                  current === "settings" ? null : "settings",
                )
              }
              aria-expanded={activeSection === "settings"}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-900 transition hover:bg-indigo-50 active:scale-[0.99]"
            >
              <span>{t("settings.title")}</span>
              <span aria-hidden="true" className="text-indigo-600">
                {activeSection === "settings" ? "−" : "+"}
              </span>
            </button>
            {activeSection === "settings" && (
              <div className="max-h-[22rem] space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-indigo-50 px-3 py-3 pr-2 text-xs font-bold text-indigo-950">
                <div>
                  <p>
                    {t("settings.onboarding")}:{" "}
                    {user.onboardingCompleted
                      ? t("settings.completed")
                      : t("settings.needsSetup")}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl bg-white/70 p-3 ring-1 ring-indigo-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">
                      {t("settings.languageTitle")}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-700">
                      {t("settings.languageDescription")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {locales.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateLocalePreference(option)}
                        aria-pressed={locale === option}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition active:scale-[0.99] ${locale === option ? "bg-indigo-700 text-white shadow-lg shadow-indigo-950/10" : "bg-white text-indigo-950 ring-1 ring-indigo-100 hover:bg-indigo-50"}`}
                      >
                        {localeLabels[option]}
                      </button>
                    ))}
                  </div>
                  {localeMessage && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                      {localeMessage}
                    </p>
                  )}
                  {localeError && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                      {localeError}
                    </p>
                  )}
                </div>
                <form
                  onSubmit={changePassword}
                  className="space-y-2 rounded-2xl bg-white/70 p-3 ring-1 ring-indigo-100"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">
                      {t("settings.changePassword")}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-700">
                      {t("settings.passwordHelp")}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-black text-indigo-950">
                      {t("settings.currentPassword")}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        updatePasswordField(
                          "currentPassword",
                          event.target.value,
                        )
                      }
                      autoComplete="current-password"
                      required
                      disabled={isPasswordPending}
                      className="mt-1 w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black text-indigo-950">
                      {t("settings.newPassword")}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        updatePasswordField("newPassword", event.target.value)
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={isPasswordPending}
                      className="mt-1 w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black text-indigo-950">
                      {t("settings.confirmPassword")}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        updatePasswordField(
                          "confirmPassword",
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={isPasswordPending}
                      className="mt-1 w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isPasswordPending}
                    className="w-full rounded-xl bg-indigo-700 px-3 py-2 text-xs font-black text-white shadow-lg shadow-indigo-950/10 transition hover:bg-indigo-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {isPasswordPending
                      ? t("settings.updatingPassword")
                      : t("settings.updatePassword")}
                  </button>
                  {passwordError && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                      {passwordSuccess}
                    </p>
                  )}
                </form>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              disabled={isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-navy px-3 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-indigo-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isPending ? t("auth.loggingOut") : t("auth.logout")}
            </button>
            {error && (
              <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LegalContentSection({
  section,
  title,
  expanded,
  html,
  emptyText,
  error,
  onToggle,
}: {
  section: "gameRules" | "terms";
  title: string;
  expanded: boolean;
  html?: string | null;
  emptyText: string;
  error: string | null;
  onToggle: () => void;
}) {
  const accentClass =
    section === "gameRules" ? "text-amber-600" : "text-fuchsia-600";
  const hoverClass =
    section === "gameRules" ? "hover:bg-amber-50" : "hover:bg-fuchsia-50";
  const panelClass =
    section === "gameRules"
      ? "bg-amber-50 text-amber-950"
      : "bg-fuchsia-50 text-fuchsia-950";

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm font-black text-slate-900 transition ${hoverClass} active:scale-[0.99]`}
      >
        <span>{title}</span>
        <span aria-hidden="true" className={accentClass}>
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div
          className={`max-h-96 overflow-y-auto rounded-2xl px-3 py-3 text-xs font-bold ${panelClass}`}
        >
          {error ? (
            <p>{error}</p>
          ) : html ? (
            <div
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p>{emptyText}</p>
          )}
        </div>
      )}
    </>
  );
}
