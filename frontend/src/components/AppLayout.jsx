import React, { useState, useEffect } from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import { Logo } from "../components/Logo.jsx";
import { Globe, LogOut, User, Heart, Menu, X, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell.jsx";
import { DonorNotificationBell } from "./DonorNotificationBell.jsx";
import { useDonorNotifications } from "../hooks/useDonorNotifications.js";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import logo from "../../assets/logo.png";

export default function AppLayout({ children, mobileMenu }) {
  const { language, toggleLanguage, direction, t } = useLanguage();
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  const [isNotificationsClosing, setIsNotificationsClosing] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Use shared hook for donor notifications
  const { unreadCount: donorUnreadCount } = useDonorNotifications(accessToken, { autoFetch: user?.role === 'donor' });

  const closeMenuWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  const closeNotificationsPanelWithAnimation = () => {
    setIsNotificationsClosing(true);
    setTimeout(() => {
      setNotificationsPanelOpen(false);
      setIsNotificationsClosing(false);
    }, 300); // Match animation duration
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    closeMenuWithAnimation();
  };

  // Listen for close menu event
  React.useEffect(() => {
    const handleCloseMenu = () => {
      closeMenuWithAnimation();
    };

    window.addEventListener("closeMobileMenu", handleCloseMenu);
    return () => window.removeEventListener("closeMobileMenu", handleCloseMenu);
  }, []);

  // Fetch notification counts for admin
  useEffect(() => {
    if (user?.role !== "super_admin") return;

    const fetchAdminNotifications = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/auth/admin/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const pending = Array.isArray(data)
            ? data.filter((acc) => !acc.verifiedByAdmin).length
            : 0;
          setNotificationsCount(pending);
        }
      } catch (err) {
        console.error("Error fetching admin notifications:", err);
      }
    };

    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 5000);
    return () => clearInterval(interval);
  }, [user?.role, accessToken]);

  // Set count for mobile display
  useEffect(() => {
    if (user?.role === "donor") {
      setNotificationsCount(donorUnreadCount);
    }
  }, [user?.role, donorUnreadCount]);

  // Inline styles for animations
  const sidebarAnimationStyle = {
    animation: isClosing
      ? language === "ar"
        ? 'slideOutLeft 0.3s ease-out forwards'
        : 'slideOutRight 0.3s ease-out forwards'
      : language === "ar"
      ? 'slideInLeft 0.3s ease-out forwards'
      : 'slideInRight 0.3s ease-out forwards'
  };

  const notificationsAnimationStyle = {
    animation: isNotificationsClosing
      ? language === "ar"
        ? 'slideOutLeft 0.3s ease-out forwards'
        : 'slideOutRight 0.3s ease-out forwards'
      : language === "ar"
      ? 'slideInLeft 0.3s ease-out forwards'
      : 'slideInRight 0.3s ease-out forwards'
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutLeft {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>

      {/* Overlay Backdrop */}
      {(mobileMenuOpen || isClosing || notificationsPanelOpen || isNotificationsClosing) && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          style={{ animation: (isClosing || isNotificationsClosing) ? 'fadeOut 0.3s ease-out forwards' : 'fadeIn 0.3s ease-out forwards' }}
          onClick={() => {
            if (mobileMenuOpen) closeMenuWithAnimation();
            if (notificationsPanelOpen) closeNotificationsPanelWithAnimation();
          }}
        />
      )}

    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans" dir={direction}>
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left Section - Logo */}
          <div className="flex items-center gap-3">
            <Logo />
            {/* App Title - Desktop only */}
            <div className={`hidden md:block ${language === "ar" ? "text-right" : "text-left"}`}>
              <h1 className="text-lg font-black text-slate-900">{t("appTitle")}</h1>
              <p className="text-xs text-slate-500">{t("associationName")}</p>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-4">
            {/* Desktop User Info */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm hidden md:flex">
                <span className="font-semibold text-blue-900">{user.fname || user.email}</span>
                <span className="text-xs text-blue-600">({user.role})</span>
              </div>
            )}
            
            {/* Desktop actions */}
            <div className="hidden md:flex flex-row items-center gap-3">
              {user?.role === "donor" && <DonorNotificationBell />}
              {user?.role === "super_admin" && <NotificationBell />}
              
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold transition whitespace-nowrap"
              >
                <Globe className="w-4 h-4" />
                {language === "ar" ? "EN" : "AR"}
              </button>

              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </button>
              )}
            </div>

            {/* Mobile Notifications Button */}
            <button
              onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
              disabled={isNotificationsClosing}
              className="md:hidden flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 relative"
            >
              <Bell className="w-5 h-5" />
              {notificationsCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {notificationsCount > 9 ? "9+" : notificationsCount}
                </span>
              )}
            </button>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              disabled={isClosing}
              className="md:hidden flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"
            >
              {mobileMenuOpen && !isClosing ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar - Full Screen */}
      {(mobileMenuOpen || isClosing) && (
        <div 
          className="md:hidden bg-white fixed inset-0 z-50 overflow-y-auto flex flex-col"
          style={sidebarAnimationStyle}
        >
          {/* Header Section */}
          <div className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between flex-shrink-0">
            <div>
            </div>
            <button
              onClick={closeMenuWithAnimation}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* User Info */}
            {user && (
              <div className="px-3 py-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user.fname || user.email}
                </p>
                <p className="text-sm text-blue-600 mt-1">({user.role})</p>
              </div>
            )}

            {/* Mobile Menu Items (Tabs) */}
            {mobileMenu}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200 p-4 space-y-2 flex-shrink-0">
            {/* Language Toggler */}
            <button
              onClick={() => {
                toggleLanguage();
                closeMenuWithAnimation();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition text-left"
            >
              <Globe className="w-5 h-5" />
              {language === "ar" ? "English (EN)" : "العربية (AR)"}
            </button>

            {/* Sign Out Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition text-left"
              >
                <LogOut className="w-5 h-5" />
                {t("logout")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Notifications Panel - Full Screen */}
      {(notificationsPanelOpen || isNotificationsClosing) && (
        <div 
          className="md:hidden bg-white fixed inset-0 z-50 overflow-y-auto flex flex-col"
          style={notificationsAnimationStyle}
        >
          {/* Header Section */}
          <div className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="font-semibold text-slate-900">{t("notifications") || "Notifications"}</p>
            </div>
            <button
              onClick={closeNotificationsPanelWithAnimation}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Notifications Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {user?.role === "donor" && <DonorNotificationBell isMobilePanel={true} />}
            {user?.role === "super_admin" && <NotificationBell isMobilePanel={true} />}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto w-full flex-1 p-6">
        {children}
      </main>

      <footer className="bg-slate-900 text-white py-4 px-6 text-center text-xs">
        <p>{t("allRightsReserved")}</p>
      </footer>
    </div>
    </>
  );
}
