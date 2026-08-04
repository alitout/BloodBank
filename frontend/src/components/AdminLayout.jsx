import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "./LanguageContext.jsx";
import AppLayout from "./AppLayout.jsx";

export default function AdminLayout({ children }) {
  const { language } = useLanguage();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminActiveTab") || "overview";
  });

  const tabs = [
    { id: "overview", label: language === "ar" ? "نظرة عامة" : "Overview", icon: "📊" },
    { id: "requests", label: language === "ar" ? "الطلبات" : "Requests", icon: "📋" },
    { id: "hospitals", label: language === "ar" ? "المستشفيات" : "Hospitals", icon: "🏥" },
    { id: "donations", label: language === "ar" ? "التبرعات" : "Donations", icon: "🩸" },
    { id: "accounts", label: language === "ar" ? "الحسابات" : "Accounts", icon: "👥" },
    { id: "profiles", label: language === "ar" ? "الملفات الشخصية" : "Profiles", icon: "👤" },
    { id: "management", label: language === "ar" ? "الإدارة" : "Management", icon: "⚙️" },
    { id: "pending", label: language === "ar" ? "قيد الانتظار" : "Pending", icon: "⏳" }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("adminActiveTab", tabId);
    // Emit custom event for other components to listen to
    window.dispatchEvent(new CustomEvent("adminTabChange", { detail: { tabId } }));
    // Close mobile menu
    window.dispatchEvent(new CustomEvent("closeMobileMenu"));
    // Scroll to top to show the tab content change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mobile menu component
  const MobileMenu = (
    <div className="space-y-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition text-left ${
            activeTab === tab.id
              ? "bg-slate-800 text-white border-l-4 border-slate-600"
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
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-slate-900 border-b-2 border-slate-900 -mb-2"
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
