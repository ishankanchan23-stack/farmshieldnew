import { createContext, useContext } from "react";
import type { Language } from "../i18n/translations";
import { translations } from "../i18n/translations";

export const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({
  language: "en",
  setLanguage: () => undefined,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation() {
  const { language } = useLanguage();
  return translations[language];
}
