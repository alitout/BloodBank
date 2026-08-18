import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, X, CheckCircle } from "lucide-react";
import { useLanguage } from "./LanguageContext.jsx";

export const DonorNotificationBell = ({ isMobilePanel = false, notificationData }) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(isMobilePanel);
  const [activeTab, setActiveTab] = useState("unread");
  const bellRef = useRef(null);
  const {
    notifications = [],
    unreadCount = 0,
    loading = false,
    error = null,
    markAsRead =
    async () => false,
  } = notificationData || {};

  // Close on click outside (skip for mobile panel)
  useEffect(() => {
    if (isMobilePanel) return; // Skip click outside handler for mobile panel

    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications, isMobilePanel]);

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      if (!notification.read) {
        await markAsRead(notification._id);
      }

      // Get request ID
      const requestId =
        typeof notification.requestId === "object"
          ? notification.requestId._id
          : notification.requestId;

      // Navigate
      if (requestId) {
        navigate(
          `/request-detail/${requestId}`,
          {
            state: {
              from:
                `${location.pathname}${location.search}`,
            },
          }
        );
      }

      // Optional: close dropdown after clicking
      if (!isMobilePanel) {
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Error opening notification:", error);
    }
  };

  return (
    <div ref={bellRef} className="relative">
      {!isMobilePanel && (
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900"
          title={language === "ar" ? "الإشعارات" : "Notifications"}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          {!isMobilePanel && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setShowNotifications(false)} />}

          <div className={isMobilePanel ? "w-full bg-white" : "absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-96 max-h-96 flex flex-col"}>
            {/* Header */}
            <div className={isMobilePanel ? "p-3 border-b border-slate-200" : "p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center sticky top-0"}>
              <h3 className="font-semibold text-slate-900">
                {language === "ar" ? "الإشعارات" : "Notifications"}
              </h3>
              {!isMobilePanel && (
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              )}
            </div>

            {/* Tabs */}
            {notifications.length > 0 && (
              <div className="flex gap-0 border-b border-slate-200 bg-white px-2 pt-2">
                <button
                  onClick={() => setActiveTab("unread")}
                  className={`flex-1 px-2 py-2 font-semibold text-xs border-b-2 transition ${activeTab === "unread"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {language === "ar" ? "غير مقروء" : "Unread"} ({notifications.filter((n) => !n.read).length})
                </button>
                <button
                  onClick={() => setActiveTab("read")}
                  className={`flex-1 px-2 py-2 font-semibold text-xs border-b-2 transition ${activeTab === "read"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {language === "ar" ? "مقروء" : "Read"}
                </button>
              </div>
            )}

            {error && (
              <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Notifications List */}
            {loading &&
              notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                {language === "ar" ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 text-sm">
                  {language === "ar"
                    ? "لا توجد إشعارات جديدة"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                {(() => {
                  const unreadNotifications = notifications.filter((n) => !n.read);
                  const readNotifications = notifications.filter((n) => n.read);
                  const displayedNotifications = activeTab === "unread" ? unreadNotifications : readNotifications;

                  if (displayedNotifications.length === 0) {
                    return (
                      <div className="p-6 text-center">
                        <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-600 text-sm">
                          {activeTab === "unread"
                            ? language === "ar"
                              ? "لا توجد إشعارات جديدة"
                              : "No new notifications"
                            : language === "ar"
                              ? "لا توجد إشعارات مقروءة"
                              : "No read notifications"}
                        </p>
                      </div>
                    );
                  }

                  return displayedNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 border-b border-slate-100 transition hover:bg-slate-50 group ${!notification.read ? "bg-blue-50" : ""
                        }`}
                    >
                      <div className="flex gap-2">
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                        )}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.requestId && (
                            <div className="mt-2 text-xs text-slate-700 space-y-0.5 bg-white p-1.5 rounded">
                              <p>
                                <span className="font-semibold">
                                  {language === "ar" ? "الدم:" : "Blood:"}
                                </span>{" "}
                                {typeof notification.requestId === 'object' ? notification.requestId.bloodType : "Unknown"}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  {language === "ar" ? "المستشفى:" : "Hospital:"}
                                </span>{" "}
                                {typeof notification.requestId === 'object' ? notification.requestId.hospital : "Unknown"}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString(
                              language === "ar" ? "ar-SA" : "en-US"
                            )}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="flex-shrink-0 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition opacity-0 group-hover:opacity-100"
                            title={language === "ar" ? "وضع علامة كمقروء" : "Mark as read"}
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
