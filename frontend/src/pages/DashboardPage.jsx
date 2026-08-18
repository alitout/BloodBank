import React, { useEffect, } from "react";
import { useNavigate, useSearchParams, } from "react-router-dom";
import { useLanguage } from "../components/LanguageContext.jsx";
import { useAuth } from "../components/AuthContext.jsx";
import AppLayout from "../components/AppLayout.jsx";
import { NewRequestForm } from "../components/NewRequestForm.jsx";
import { PortalHospital } from "../components/PortalHospital.jsx";
import { RequestsList } from "../components/RequestsList.jsx";
import { AssignedRequests } from "../components/AssignedRequests.jsx";
import { DonationHistory } from "../components/DonationHistory.jsx";
import { DonorProfilePage } from "./DonorProfilePage.jsx";
import MyRequests from "../components/MyRequests.jsx";
import { Building07, ClockRewind, Droplets01, File02, FileCheck02, HeartHand, User01, } from "@untitledui/icons";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams,] = useSearchParams();


  // Build tabs based on user role
  const getTabs = () => {
    const commonTabs = [
      { id: "seek-blood", label: language === "ar" ? "طلب دم" : "Request Blood", icon: Droplets01, },
      { id: "hospitals", label: language === "ar" ? "المستشفيات" : "Hospitals", icon: Building07, },
    ];

    const donorTabs = [
      { id: "assigned", label: language === "ar" ? "الطلبات المعينة" : "Assigned Requests", icon: FileCheck02, },
      { id: "requests", label: language === "ar" ? "الطلبات" : "Requests", icon: HeartHand, },
      { id: "my-requests", label: language === "ar" ? "طلباتي" : "My Requests", icon: File02, },
      { id: "history", label: language === "ar" ? "سجل تبرعاتي" : "History", icon: ClockRewind, },
      { id: "profile", label: language === "ar" ? "ملفي الشخصي" : "Profile", icon: User01, },
    ];

    return user?.role === "donor"
      ? [
        ...donorTabs,
        ...commonTabs,
      ]
      : commonTabs;
  };

  const tabs = getTabs();

  const validTabIds = tabs.map((tab) => tab.id);
  const defaultTab = user?.role === "donor" ? "requests" : "seek-blood";
  const requestedTab = searchParams.get("tab");
  const activeTab = validTabIds.includes(requestedTab) ? requestedTab : defaultTab;

  useEffect(() => {
    if (requestedTab !== activeTab) {
      setSearchParams({ tab: activeTab, }, { replace: true, });
    }
  }, [requestedTab, activeTab, setSearchParams,]);


  const handleTabClick = (
    tabId
  ) => {
    setSearchParams({
      tab: tabId,
    });

    window.dispatchEvent(
      new CustomEvent(
        "closeMobileMenu"
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Mobile menu component
  const MobileMenu = (
    <div className="space-y-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition text-left ${activeTab === tab.id
            ? "bg-red-100 text-red-700 border-l-4 border-red-600"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
        >
          {React.createElement(
            tab.icon,
            {
              className:
                "h-5 w-5 shrink-0",
            }
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );

  const handleRequestCreated =
    () => {
      setSearchParams({
        tab:
          "my-requests",
      });

      window.dispatchEvent(
        new CustomEvent(
          "donor-request-updated"
        )
      );
    };

  return (
    <AppLayout mobileMenu={MobileMenu}>
      {user?.role === "donor" && (
        <div className="hidden justify-end md:flex">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/donor-intent"
              )
            }
            className="text-sm font-semibold text-slate-600 hover:text-red-600"
          >
            {t("changePurpose")}
          </button>
        </div>
      )}
      <div className="space-y-6">
        {/* Tab Navigation - Desktop only */}
        <div className="hidden md:flex gap-2 border-b border-slate-200 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? "text-red-600 border-b-2 border-red-600 -mb-2"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {React.createElement(
                tab.icon,
                {
                  className:
                    "h-5 w-5 shrink-0",
                }
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* Donor-specific tabs */}
          {activeTab === "assigned" && <AssignedRequests />}
          {activeTab === "requests" && <RequestsList />}
          {activeTab === "my-requests" && <MyRequests />}
          {activeTab === "history" && <DonationHistory />}
          {activeTab === "profile" && <DonorProfilePage />}

          {/* Common tabs */}
          {activeTab === "seek-blood" && (<NewRequestForm onSuccess={handleRequestCreated} />)}
          {activeTab === "hospitals" && <PortalHospital user={user} />}
        </div>
      </div>
    </AppLayout>
  );
}
