import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { Bell, X, Check, AlertCircle } from "lucide-react";

export const NotificationPermissionPrompt = () => {
  const { t, language } = useLanguage();
  const [permission, setPermission] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("lsa_notification_dismissed") === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check current notification permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!("Notification" in window)) {
        setError(t("notificationNotSupported") || "Notifications not supported");
        return;
      }

      if (Notification.permission === "granted") {
        setPermission("granted");
        subscribeUserToPush();
        return;
      }

      if (Notification.permission !== "denied") {
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === "granted") {
          subscribeUserToPush();
          localStorage.setItem("lsa_notification_dismissed", "true");
        }
      }
    } catch (err) {
      console.error("Notification permission error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUserToPush = async () => {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Worker not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("Already subscribed to push notifications");
        return;
      }
      
      console.log("Push subscription ready (VAPID key needed for production)");
    } catch (err) {
      console.error("Push subscription error:", err);
      setError(err.message);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("lsa_notification_dismissed", "true");
  };

  // Show nothing if already granted, dismissed, or not supported
  if (isDismissed || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {language === "ar"
                ? "تلقى إشعارات الطلبات الجديدة"
                : "Get notified about new requests"}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {language === "ar"
                ? "فعّل الإشعارات لتلقي تحديثات فورية عن الطلبات الجديدة"
                : "Enable notifications to get instant updates about new blood requests"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
          {error && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
          )}

          <button
            onClick={requestNotificationPermission}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{language === "ar" ? "جاري..." : "Loading..."}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{language === "ar" ? "فعّل الآن" : "Enable Now"}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 transition rounded hover:bg-slate-200"
            aria-label="Dismiss notification permission prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
