import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { Download, Sparkles, X, Check } from "lucide-react";

export const InstallPrompt = () => {
  const { t, language } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("lsa_pwa_dismissed") === "true";
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      localStorage.setItem("lsa_pwa_installed", "true");
    });

    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setIsInstalled(true);
      localStorage.setItem("lsa_pwa_installed", "true");
      setTimeout(() => {
        alert(t("installSuccessPrompt"));
      }, 300);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("lsa_pwa_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div className="bg-red-600 text-white py-3.5 px-4 shadow-md sticky top-0 z-50 transition-all border-b border-red-700">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-full hidden xs:block">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div className="text-center sm:text-left rtl:sm:text-right">
            <p className="font-semibold text-sm sm:text-base">
              {isInstalled ? t("pwaInstalled") : t("installPWA")}
            </p>
            <p className="text-xs text-red-100 mt-0.5">
              {t("pwaRequirementsMet")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
          {isInstalled ? (
            <div className="flex items-center gap-1.5 bg-green-600/30 border border-green-500/50 text-green-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Check className="w-4 h-4" />
              <span>{language === "ar" ? "جاهز على الهاتف" : "Ready on Screen"}</span>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 bg-white text-red-600 font-semibold py-1.5 px-4 rounded-lg text-xs hover:bg-neutral-100 transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{language === "ar" ? "ثبّت التطبيق الآن" : "Install PWA App"}</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1 text-red-200 hover:text-white transition rounded-full hover:bg-white/10"
            aria-label="Dismiss installation prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
