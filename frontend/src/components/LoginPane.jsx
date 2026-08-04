import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { Mail, KeyRound, CheckCircle, ShieldAlert, Eye, EyeOff, AlertCircle } from "lucide-react";

export const LoginPane = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { prefetchData } = useDataCache();
  const { t, language } = useLanguage();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setWarningMsg("");
    setIsSubmitting(true);

    try {
      if (!emailOrPhone.trim()) {
        setErrorMsg(t("emailOrPhoneRequired"));
        setIsSubmitting(false);
        return;
      }

      if (!password) {
        setErrorMsg(t("passwordRequired"));
        setIsSubmitting(false);
        return;
      }

      // Determine if input is email or phone
      const isEmail = emailOrPhone.includes("@");
      const loginData = {
        password,
        stayLoggedIn
      };

      if (isEmail) {
        loginData.email = emailOrPhone.toLowerCase();
      } else {
        loginData.phone = emailOrPhone;
      }

      const result = await login(loginData);

      if (result.success) {
        // Check verification status and user role
        const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        const accessToken = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        
        // Prefetch data based on user role
        if (user && accessToken) {
          await prefetchData(user, accessToken);
        }

        let hasWarning = false;
        let redirectPath = "/dashboard";
        
        // Redirect admin users to /admin page
        if (user.role === 'super_admin') {
          redirectPath = "/admin";
          setSuccessMsg(t("loginSuccessful"));
        } else if (user.role === 'donor' && !user.verifiedByAdmin) {
          hasWarning = true;
          setWarningMsg(t("accountPendingVerification"));
        } else {
          setSuccessMsg(t("loginSuccessful"));
        }
        // Navigate to appropriate page after a short delay
        const delay = hasWarning ? 2500 : 1500;
        setTimeout(() => {
          if (onSuccess) onSuccess();
          navigate(redirectPath);
        }, delay);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err) {
      setErrorMsg(err.message || t("anErrorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 max-w-md mx-auto my-4 transition-all overflow-hidden animate-fade-in text-slate-800">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
          {t("login")}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {t("enterLoginCredentials")}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 font-bold p-3 rounded-lg text-xs flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {warningMsg && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 font-bold p-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold p-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or Phone */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
            {t("emailOrPhone")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder={t("emailOrPhonePlaceholder")}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-3 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
              required
            />
          </div>
          <p className="text-[9px] text-slate-400 mt-1">
            {t("useEmailOrPhone")}
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">
            {t("password")}
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 pl-9 pr-9 font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
              title={t("showHidePassword")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stay Logged In */}
        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="stayLoggedIn"
            checked={stayLoggedIn}
            onChange={(e) => setStayLoggedIn(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-red-600"
          />
          <label htmlFor="stayLoggedIn" className="text-xs font-semibold text-slate-700 cursor-pointer flex-1">
            {t("stayLoggedIn")}
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition shadow-sm hover:shadow-md disabled:opacity-50 select-none mt-4"
        >
          {isSubmitting
            ? t("signingIn")
            : t("login")
          }
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-slate-100 text-center">
        <p className="text-[9px] text-slate-500">
          {t("passwordsEncrypted")}
        </p>
      </div>
    </div>
  );
};
