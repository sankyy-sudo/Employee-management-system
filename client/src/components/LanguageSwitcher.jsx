import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" }
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" title={t("common.language")}>
      <Globe2 size={17} />
      <select
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="bg-transparent text-sm outline-none"
        aria-label={t("common.language")}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>{language.label}</option>
        ))}
      </select>
    </label>
  );
}
