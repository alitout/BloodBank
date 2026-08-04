import React, { useState, useEffect } from "react";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import { NewRequestForm } from "../components/NewRequestForm.jsx";
import { PortalHospital } from "../components/PortalHospital.jsx";
import { PortalAdmin } from "../components/PortalAdmin.jsx";
import { RequestsList } from "../components/RequestsList.jsx";
import { AssignedRequests } from "../components/AssignedRequests.jsx";
import { DonationHistory } from "../components/DonationHistory.jsx";
import { DonorProfilePage } from "./DonorProfilePage.jsx";

export default function DashboardPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const defaultTab = user?.role === "donor" ? "requests" : "seek-blood";
    return localStorage.getItem("dashboardActiveTab") || defaultTab;
  });

  // Build tabs based on user role
  const getTabs = () => {
    const commonTabs = [
      { id: "seek-blood", label: language === "ar" ? "طلب دم" : "Request Blood", icon: "🩸" },
      { id: "hospitals", label: language === "ar" ? "المستشفيات" : "Hospitals", icon: "🏥" }
    ];

    const donorTabs = [
      { id: "assigned", label: language === "ar" ? "الطلبات المعينة" : "Assigned Requests", icon: "✓" },
      { id: "requests", label: language === "ar" ? "الطلبات" : "Requests", icon: "❤️" },
      { id: "history", label: language === "ar" ? "السجل" : "History", icon: "🏆" },
      { id: "profile", label: language === "ar" ? "ملفي الشخصي" : "Profile", icon: "👤" }
    ];

    let tabs = commonTabs;
    if (user?.role === "donor") {
      tabs = [...donorTabs, ...commonTabs];
    }

    if (user?.role === "super_admin") {
      tabs.push({ id: "admin", label: language === "ar" ? "الإدارة" : "Admin", icon: "⚙️" });
    }

    return tabs;
  };

  const tabs = getTabs();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("dashboardActiveTab", tabId);
    // Close mobile menu
    window.dispatchEvent(new CustomEvent("closeMobileMenu"));
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
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
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
          {/* Donor-specific tabs */}
          {activeTab === "assigned" && <AssignedRequests />}
          {activeTab === "requests" && <RequestsList />}
          {activeTab === "history" && <DonationHistory />}
          {activeTab === "profile" && <DonorProfilePage />}

          {/* Common tabs */}
          {activeTab === "seek-blood" && <NewRequestForm />}
          {activeTab === "hospitals" && <PortalHospital user={user} />}
          {activeTab === "admin" && <PortalAdmin user={user} />}
        </div>
      </div>
    </AppLayout>
  );
}
