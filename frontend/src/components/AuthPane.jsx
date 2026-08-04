import React, { useState } from "react";
import { LoginPane } from "./LoginPane.jsx";
import { RegisterPane } from "./RegisterPane.jsx";
import { RotateCcw } from "lucide-react";
import { useLanguage } from "./LanguageContext.jsx";

export const AuthPane = ({ onSuccess, requiredRole }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="relative">
      {/* Toggle button */}
      <div className="flex justify-center mb-4 gap-2">
        <button
          onClick={() => setIsRegistering(false)}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${
            !isRegistering
              ? 'bg-red-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {t("login")}
        </button>
        <button
          onClick={() => setIsRegistering(true)}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${
            isRegistering
              ? 'bg-red-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {t("register")}
        </button>
      </div>

      {/* Login Form */}
      {!isRegistering && (
        <LoginPane onSuccess={onSuccess} />
      )}

      {/* Register Form */}
      {isRegistering && (
        <RegisterPane onSuccess={onSuccess} />
      )}
    </div>
  );
};
