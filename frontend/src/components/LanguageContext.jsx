import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../data/translations.js";

/**
 * @typedef {Object} LanguageContextProps
 * @property {"en" | "ar"} language
 * @property {"ltr" | "rtl"} direction
 * @property {Function} toggleLanguage
 * @property {Function} t
 */

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("lsa_app_lang");
    return (saved === "ar" || saved === "en") ? saved : "ar";
  });

  const [direction, setDirection] = useState("rtl");

  useEffect(() => {
    localStorage.setItem("lsa_app_lang", language);
    const newDir = language === "ar" ? "rtl" : "ltr";
    setDirection(newDir);
    
    document.documentElement.setAttribute("dir", newDir);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.className = language === "ar" ? "rtl font-cairo" : "ltr font-sans";
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  };

  const t = (key) => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation["en"] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, toggleLanguage, t }}>
      <div className={language === "ar" ? "rtl font-cairo" : "ltr font-sans"}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
