import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { Bell, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDonorNotifications } from "../hooks/useDonorNotifications.js";

export const DonorNotifications = () => {
  const { t, language } = useLanguage();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("unread");
  const { notifications, unreadCount, loading, error, markAsRead, refetch } = useDonorNotifications(accessToken);

  const handleGoToRequest = async (
    notification
  ) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    const requestId =
      typeof notification.requestId === 'object'
        ? notification.requestId._id
        : notification.requestId;

    if (requestId) {
      navigate(
        `/request-detail/${requestId}`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // Separate read and unread notifications
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);
  const displayedNotifications =
    activeTab === "unread" ? unreadNotifications : readNotifications;

  return (
    <div className="space-y-4">
      {/* Header with unread count */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Bell size={24} />
          <h2 className="text-xl font-semibold">
            {language === "ar" ? "الإشعارات" : "Notifications"}
          </h2>
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white rounded-full px-3 py-1 text-sm font-bold">
            {unreadCount}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-2 border-b border-slate-200 bg-white rounded-lg">
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 px-4 py-3 font-semibold text-sm border-b-2 transition ${activeTab === "unread"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
          >
            {language === "ar" ? "غير مقروء" : "Unread"}{" "}
            {unreadNotifications.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                {unreadNotifications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 px-4 py-3 font-semibold text-sm border-b-2 transition ${activeTab === "read"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
          >
            {language === "ar" ? "مقروء" : "Read"}
          </button>
        </div>
      )}

      {displayedNotifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Bell size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">
            {activeTab === "unread"
              ? language === "ar"
                ? "لا توجد إشعارات جديدة"
                : "No new notifications"
              : language === "ar"
                ? "لا توجد إشعارات مقروءة"
                : "No read notifications"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${notification.read
                ? "bg-gray-50 border-gray-200"
                : "bg-blue-50 border-blue-200"
                }`}
            >
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-gray-700 text-sm mt-1">
                      {notification.message}
                    </p>
                    {notification.requestId && (
                      <div className="mt-3 text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold">
                            {language === "ar" ? "نوع الدم:" : "Blood Type:"}
                          </span>{" "}
                          {notification.requestId.bloodType}
                        </p>
                        <p>
                          <span className="font-semibold">
                            {language === "ar" ? "المستشفى:" : "Hospital:"}
                          </span>{" "}
                          {notification.requestId.hospital}
                        </p>
                        <p>
                          <span className="font-semibold">
                            {language === "ar" ? "الوحدات المطلوبة:" : "Units Needed:"}
                          </span>{" "}
                          {notification.requestId.unitsNeeded}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.createdAt).toLocaleDateString(
                        language === "ar" ? "ar-SA" : "en-US"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {notification.assignedByThisNotification && (
                  <div
                    className="flex items-center gap-1 text-green-600 text-sm font-semibold"
                    title={language === "ar" ? "تم التعيين" : "Assigned"}
                  >
                    <CheckCircle size={16} />
                  </div>
                )}
                <button
                  onClick={() => handleGoToRequest(notification)}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition"
                >
                  {language === "ar" ? "عرض" : "View"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
