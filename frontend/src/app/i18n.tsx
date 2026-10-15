import { useState } from "react";
import type { ReactNode } from "react";
import { LanguageContext } from "./i18n-context";
import type { Language } from "../i18n/translations";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const value = localStorage.getItem("farmshield_language");
    return value === "hi" || value === "mr" ? value : "en";
  });
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
