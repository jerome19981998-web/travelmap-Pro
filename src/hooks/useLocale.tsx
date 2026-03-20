"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, type Locale, type Translations } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("travelmap-locale") as Locale | null;
    if (saved && translations[saved]) setLocaleState(saved);
    else {
      const browser = navigator.language.split("-")[0] as Locale;
      if (translations[browser]) setLocaleState(browser);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("travelmap-locale", l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
