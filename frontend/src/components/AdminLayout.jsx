import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext.jsx";
import AppLayout from "./AppLayout.jsx";

export default function AdminLayout({ children }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] =
    useState(() => {
      const savedTab =
        localStorage.getItem(
          "adminActiveTab"
        );

      return savedTab === "profiles"
        ? "pending"
        : savedTab || "overview";
    });

  const tabs = [
    { id: "overview", label: language === "ar" ? "نظرة عامة" : "Overview", icon: "📊" },
    { id: "requests", label: language === "ar" ? "الطلبات" : "Requests", icon: "📋" },
    { id: "hospitals", label: language === "ar" ? "المستشفيات" : "Hospitals", icon: "🏥" },
    { id: "donations", label: language === "ar" ? "التبرعات" : "Donations", icon: "🩸" },
    { id: "accounts", label: language === "ar" ? "الحسابات" : "Accounts", icon: "👥" },
    { id: "management", label: language === "ar" ? "الإدارة" : "Management", icon: "⚙️" },
    { id: "pending", label: language === "ar" ? "قيد الانتظار" : "Pending", icon: "⏳" }
  ];

  useEffect(() => {
    const requestedTab =
      new URLSearchParams(
        location.search
      ).get("tab");

    const validTab =
      tabs.some(
        (tab) =>
          tab.id === requestedTab
      );

    if (requestedTab && validTab) {
      setActiveTab(requestedTab);

      localStorage.setItem(
        "adminActiveTab",
        requestedTab
      );
    }
  }, [
    location.search,
    language
  ]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);

    localStorage.setItem("adminActiveTab", tabId);
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("tab", tabId);
    /*
     * Remove an old pending section
     * when moving to another main tab.
     */
    if (tabId !== "pending") {
      searchParams.delete(
        "section"
      );
    }

    navigate({
      pathname:
        location.pathname,
      search:
        `?${searchParams.toString()}`
    });

    window.dispatchEvent(
      new CustomEvent(
        "adminTabChange",
        {
          detail: {
            tabId
          }
        }
      )
    );

    window.dispatchEvent(
      new CustomEvent(
        "closeMobileMenu"
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        location.search
      );

    const requestedTab =
      searchParams.get("tab");

    /*
     * Redirect the removed old Profiles
     * tab to the new Pending action center.
     */
    if (
      requestedTab === "profiles"
    ) {
      searchParams.set(
        "tab",
        "pending"
      );

      searchParams.set(
        "section",
        "profile-requests"
      );

      localStorage.setItem(
        "adminActiveTab",
        "pending"
      );

      setActiveTab(
        "pending"
      );

      navigate({
        pathname:
          location.pathname,
        search:
          `?${searchParams.toString()}`
      }, {
        replace: true
      });

      return;
    }

    const validTabs = [
      "overview",
      "requests",
      "hospitals",
      "donations",
      "accounts",
      "management",
      "pending"
    ];

    if (
      requestedTab &&
      validTabs.includes(
        requestedTab
      )
    ) {
      setActiveTab(
        requestedTab
      );

      localStorage.setItem(
        "adminActiveTab",
        requestedTab
      );
    }
  }, [
    location.pathname,
    location.search,
    navigate
  ]);

  // Mobile menu component
  const MobileMenu = (
    <div className="space-y-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition text-left ${activeTab === tab.id
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
              className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
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
