import React from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { AuthPane } from "../components/AuthPane.jsx";
import { Logo } from "../components/Logo.jsx";
import { Globe } from "lucide-react";

export default function LoginPage() {
  const { t, language, toggleLanguage, direction } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans" dir={direction}>
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className={language === "ar" ? "text-right" : "text-left"}>
              <h1 className="text-lg font-black text-slate-900">{t("appTitle")}</h1>
              <p className="text-xs text-slate-500">{t("associationName")}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold transition"
            >
              <Globe className="w-4 h-4" />
              {language === "ar" ? "EN" : "AR"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full flex-1 p-6 flex items-center justify-center">
        <AuthPane />
      </main>

      <footer className="bg-slate-900 text-white py-4 px-6 text-center text-xs">
        <p>{t("allRightsReserved")}</p>
      </footer>
    </div>
  );
}
