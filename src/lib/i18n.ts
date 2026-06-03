export const locales = ["en", "my"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  my: "မြန်မာ"
};

export const translations = {
  en: {
    "app.eyebrow": "2026 Pool",
    "nav.home": "Home",
    "nav.predict": "Predict",
    "nav.winners": "WC26",
    "nav.leagues": "Mini Leagues",
    "nav.history": "History",
    "profile.openMenu": "Open profile menu",
    "profile.myProfile": "My profile",
    "profile.detailsToggle": "See profile details",
    "profile.displayName": "Display name",
    "profile.email": "Email",
    "profile.emailMissing": "Not added",
    "settings.title": "Settings",
    "settings.onboarding": "Onboarding",
    "settings.completed": "Completed",
    "settings.needsSetup": "Needs setup",
    "settings.languageTitle": "Language",
    "settings.languageDescription": "Choose the language used in your app.",
    "settings.languageSaved": "Language preference saved.",
    "settings.languageError": "Could not save language preference. Your device preference was still updated.",
    "settings.changePassword": "Change password",
    "settings.passwordHelp": "Use at least 8 characters for your new password.",
    "settings.currentPassword": "Current password",
    "settings.newPassword": "New password",
    "settings.confirmPassword": "Confirm new password",
    "settings.updatePassword": "Update password",
    "settings.updatingPassword": "Updating password…",
    "settings.passwordTooShort": "New password must be at least 8 characters.",
    "settings.passwordMismatch": "New password and confirmation do not match.",
    "settings.passwordSaveError": "Could not update password. Please try again.",
    "settings.passwordSaved": "Password updated successfully.",
    "auth.logout": "Log out",
    "auth.loggingOut": "Logging out…",
    "auth.logoutError": "Could not log out. Please try again."
  },
  my: {
    "app.eyebrow": "၂၀၂၆ ခန့်မှန်းပြိုင်ပွဲ",
    "nav.home": "ပင်မ",
    "nav.predict": "ခန့်မှန်း",
    "nav.winners": "WC26",
    "nav.leagues": "မီနီလိဂ်များ",
    "nav.history": "မှတ်တမ်း",
    "profile.openMenu": "ပရိုဖိုင်မီနူး ဖွင့်ရန်",
    "profile.myProfile": "ကျွန်ုပ်၏ ပရိုဖိုင်",
    "profile.detailsToggle": "ပရိုဖိုင် အသေးစိတ်ကြည့်ရန်",
    "profile.displayName": "ပြသမည့်အမည်",
    "profile.email": "အီးမေးလ်",
    "profile.emailMissing": "မထည့်ရသေးပါ",
    "settings.title": "ဆက်တင်များ",
    "settings.onboarding": "အစပြုဆက်တင်",
    "settings.completed": "ပြီးဆုံးပြီး",
    "settings.needsSetup": "ပြင်ဆင်ရန်လိုသည်",
    "settings.languageTitle": "ဘာသာစကား",
    "settings.languageDescription": "အက်ပ်တွင် အသုံးပြုမည့် ဘာသာစကားကို ရွေးပါ။",
    "settings.languageSaved": "ဘာသာစကား ရွေးချယ်မှု သိမ်းဆည်းပြီးပါပြီ။",
    "settings.languageError": "ဘာသာစကား ရွေးချယ်မှုကို ဆာဗာတွင် မသိမ်းနိုင်ပါ။ သင့်စက်တွင်တော့ ပြောင်းလဲပြီးပါပြီ။",
    "settings.changePassword": "စကားဝှက် ပြောင်းရန်",
    "settings.passwordHelp": "စကားဝှက်အသစ်တွင် အက္ခရာ အနည်းဆုံး ၈ လုံး သုံးပါ။",
    "settings.currentPassword": "လက်ရှိ စကားဝှက်",
    "settings.newPassword": "စကားဝှက်အသစ်",
    "settings.confirmPassword": "စကားဝှက်အသစ် အတည်ပြုရန်",
    "settings.updatePassword": "စကားဝှက် သိမ်းမည်",
    "settings.updatingPassword": "စကားဝှက် သိမ်းနေသည်…",
    "settings.passwordTooShort": "စကားဝှက်အသစ်သည် အနည်းဆုံး ၈ လုံး ဖြစ်ရမည်။",
    "settings.passwordMismatch": "စကားဝှက်အသစ်နှင့် အတည်ပြုစကားဝှက် မကိုက်ညီပါ။",
    "settings.passwordSaveError": "စကားဝှက် မပြောင်းနိုင်ပါ။ ထပ်မံကြိုးစားပါ။",
    "settings.passwordSaved": "စကားဝှက် ပြောင်းလဲပြီးပါပြီ။",
    "auth.logout": "ထွက်မည်",
    "auth.loggingOut": "ထွက်နေသည်…",
    "auth.logoutError": "မထွက်နိုင်ပါ။ ထပ်မံကြိုးစားပါ။"
  }
} as const;

export type TranslationKey = keyof typeof translations.en;

export function normalizeLocale(locale: unknown): Locale {
  return locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
}

export function translate(locale: Locale, key: TranslationKey) {
  return translations[locale][key] ?? translations[defaultLocale][key];
}
