import React, { useState, } from "react";
import { useNavigate, } from "react-router-dom";
import { LogOut, Loader, } from "lucide-react";
import { useAuth, } from "./AuthContext.jsx";
import { useLanguage, } from "./LanguageContext.jsx";
export const SignOutButton = ({ className = "", compact = false, }) => {
    const { logout, } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [signingOut, setSigningOut,] = useState(false);

    const handleSignOut = async () => {
        if (signingOut) {
            return;
        }

        setSigningOut(true);

        try {
            await Promise.resolve(
                logout()
            );

            navigate("/login", { replace: true, });
        } catch (
        logoutError
        ) {
            console.error(
                "[SIGN OUT] Error:",
                logoutError
            );

            navigate("/login", { replace: true, });
        }
    };

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 ${className}`}
        >
            {signingOut ? (
                <Loader
                    className="h-4 w-4 animate-spin"
                />
            ) : (
                <LogOut
                    className="h-4 w-4"
                />
            )}

            {!compact && (
                <span>
                    {signingOut
                        ? t("signingOut")
                        : t("logout")}
                </span>
            )}
        </button>
    );
};