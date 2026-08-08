import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "./LanguageContext.jsx";
import AppLayout from "./AppLayout.jsx";

export default function DonorLayout({ children }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("donorActiveTab") || "requests";
  });

  const tabs = [
    { id: "request-blood", label: language === "ar" ? "طلب دم" : "Request Blood", route: "/requestBlood", icon: "🩸" },
    { id: "requests", label: language === "ar" ? "الطلبات" : "Requests", route: "/requests", icon: "📋" },
    { id: "donors", label: language === "ar" ? "المتبرعون" : "Donors", route: "/donors", icon: "👥" },
    { id: "hospitals", label: language === "ar" ? "المستشفيات" : "Hospitals", route: "/hospitals", icon: "🏥" }
  ];

  // Update active tab based on current route
  useEffect(() => {
    const requestedTab =
      new URLSearchParams(
        location.search
      ).get("tab");

    const currentTab =
      tabs.find(
        (tab) =>
          tab.id === requestedTab
      ) ||
      tabs.find(
        (tab) =>
          tab.route ===
          location.pathname
      );

    if (currentTab) {
      setActiveTab(
        currentTab.id
      );

      localStorage.setItem(
        "donorActiveTab",
        currentTab.id
      );
    }
  }, [
    location.pathname,
    location.search
  ]);

  const handleTabClick = (tab) => {
    setActiveTab(tab.id);
    localStorage.setItem("donorActiveTab", tab.id);
    navigate(
      `${tab.route}?tab=${encodeURIComponent(
        tab.id
      )}`
    );
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent("donorTabChange", { detail: { tabId: tab.id } }));
    // Close mobile menu
    window.dispatchEvent(new CustomEvent("closeMobileMenu"));
  };

  // Mobile menu component
  const MobileMenu = (
    <div className="space-y-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition text-left ${activeTab === tab.id
            ? "bg-red-100 text-red-700 border-l-4 border-red-600"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout mobileMenu={MobileMenu}>
      <div className="space-y-6">
        {/* Tab Navigation - Desktop only */}
        <div className="hidden md:flex gap-2 border-b border-slate-200 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? "text-red-600 border-b-2 border-red-600 -mb-2"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </AppLayout>
  );
}
