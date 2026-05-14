import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

const savedLanguage = localStorage.getItem("ems-language") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      fr: { translation: fr },
      es: { translation: es }
    },
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });

i18n.on("languageChanged", (language) => {
  localStorage.setItem("ems-language", language);
  document.documentElement.lang = language;
  document.documentElement.dir = ["ar", "he", "fa", "ur"].includes(language) ? "rtl" : "ltr";
});

document.documentElement.lang = savedLanguage;

export default i18n;
