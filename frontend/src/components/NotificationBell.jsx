import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Bell, CheckCircle, Clock } from "lucide-react";

export const NotificationBell = ({ isMobilePanel = false }) => {
  const { language } = useLanguage();
  const { accessToken } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(isMobilePanel ? true : false);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(fetchPendingAccounts, 5000);
    fetchPendingAccounts();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isMobilePanel) return; // Skip click outside handler for mobile panel
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown, isMobilePanel]);

  const fetchPendingAccounts = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/auth/admin/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      const pending = Array.isArray(data)
        ? data.filter((acc) => !acc.verifiedByAdmin)
        : [];
      setPendingCount(pending.length);
      setPendingAccounts(pending.slice(0, 5));
    } catch (err) {
      console.error("Error fetching pending accounts:", err);
    }
  };

  const handleVerify = async (uid) => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/auth/admin/verify/${uid}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verifiedByAdmin: true }),
      });
      if (!response.ok) throw new Error("Failed to verify");
      fetchPendingAccounts();
    } catch (err) {
      console.error("Error verifying account:", err);
    }
  };

  return (
    <div ref={dropdownRef}>
      {!isMobilePanel && (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-2 text-slate-600 hover:text-slate-900"
        >
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      )}

      {showDropdown && (
        <div className={isMobilePanel ? "w-full bg-white" : "absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto"}>
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">
              {language === "ar" ? "الإشعارات" : "Notifications"}
            </h3>
            <p className="text-xs text-slate-500">
              {pendingCount} {language === "ar" ? "انتظار التحقق" : "Pending Verification"}
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {pendingAccounts.length > 0 ? (
              pendingAccounts.map((account) => (
                <div key={account.uid} className="p-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">
                        {account.email}
                      </p>
                      <p className="text-xs text-slate-500">{account.role}</p>
                      <button
                        onClick={() => {
                          handleVerify(account.uid);
                          if (!isMobilePanel) setShowDropdown(false);
                        }}
                        className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        {language === "ar" ? "التحقق الآن" : "Verify Now"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm">
                {language === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
