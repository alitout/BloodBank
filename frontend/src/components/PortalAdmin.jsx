import React, { useState } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useDB } from "./DBContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { BarChart3, Users, Activity, CheckCircle, Settings, Clock } from "lucide-react";
import { AdminManagement } from "./AdminManagement.jsx";
import { PendingVerification } from "./PendingVerification.jsx";
import { AdminHospitalsTab } from "./AdminHospitalsTab.jsx";
import { AdminAccountsTab } from "./AdminAccountsTab.jsx";
import { AdminRequestsTab } from "./AdminRequestsTab.jsx";
import { AdminProfileRequestsTab } from "./AdminProfileRequestsTab.jsx";
import AdminDonationsTab from "./AdminDonationsTab.jsx";

export const PortalAdmin = ({ user }) => {
  const { t, language } = useLanguage();
  const { requesters, donors, hospitals, appointments, updateRequesterStatus, fetchAdminData, refreshData, isLoading } = useDB();
  const { accounts } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Load activeTab from localStorage on mount
    return localStorage.getItem("adminActiveTab") || "overview";
  });

  React.useEffect(() => {
    const loadAdminDashboard = async () => {
      console.log("🔄 Loading admin dashboard data...");

      await Promise.all([
        refreshData(),
        fetchAdminData()
      ]);

      console.log("✅ Admin dashboard data loaded");
    };

    loadAdminDashboard();
  }, []);
  // Save activeTab to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  // Listen for tab changes from mobile menu
  React.useEffect(() => {
    const handleTabChange = (event) => {
      setActiveTab(event.detail.tabId);
    };

    window.addEventListener("adminTabChange", handleTabChange);
    return () => window.removeEventListener("adminTabChange", handleTabChange);
  }, []);

  const pendingRequests = requesters.filter(r => r.status === "pending");
  const fulfilledRequests = requesters.filter(r => r.status === "fulfilled");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 border border-slate-700 text-white">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-12 h-12 text-slate-400" />
          <div>
            <h3 className="text-xl font-bold">
              {t("adminDashboard")}
            </h3>
            <p className="text-slate-400 text-sm">
              {t("adminDashboardDescription")}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex gap-2 border-b border-slate-200 overflow-x-auto">
        {["overview", "requests", "hospitals", "donations", "accounts", "profiles", "management", "pending"].map(tab => {
          const tabLabels = {
            overview: t("overviewTab"),
            requests: t("requestsTab"),
            hospitals: t("hospitalsTab"),
            donations: t("donationsTab"),
            accounts: t("accountsTab"),
            profiles: t("profilesTab"),
            management: t("managementTab"),
            pending: t("pendingTab")
          };

          const tabIcons = {
            overview: "📊",
            requests: "📋",
            hospitals: "🏥",
            donations: "🩸",
            accounts: "👥",
            profiles: "👤",
            management: "⚙️",
            pending: "⏳"
          };
        })}
      </div>

      {activeTab === "overview" && (
        <div className="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-600 font-semibold">{t("totalDonors")}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{donors.length}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-slate-600 font-semibold">{t("activeRequests")}</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{pendingRequests.length}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600 font-semibold">{t("fulfilledRequests")}</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{fulfilledRequests.length}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-600 font-semibold">{t("totalHospitals")}</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{hospitals.length}</p>
            </div>
          </div>
          <br />

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h4 className="font-bold text-slate-900 mb-4">{language === "ar" ? "ملخص النظام" : "System Summary"}</h4>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <p><span className="font-semibold">{language === "ar" ? "إجمالي المتبرعين:" : "Total Donors:"}</span> {donors.length}</p>
                <p><span className="font-semibold">{language === "ar" ? "الطلبات النشطة:" : "Active Requests:"}</span> {pendingRequests.length}</p>
                <p><span className="font-semibold">{language === "ar" ? "الطلبات المكتملة:" : "Fulfilled Requests:"}</span> {fulfilledRequests.length}</p>
              </div>
              <div className="space-y-3">
                <p><span className="font-semibold">{language === "ar" ? "عدد المستشفيات:" : "Total Hospitals:"}</span> {hospitals.length}</p>
                <p><span className="font-semibold">{language === "ar" ? "المواعيد المحجوزة:" : "Appointments:"}</span> {appointments?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "requests" && <AdminRequestsTab />}

      {activeTab === "hospitals" && <AdminHospitalsTab />}

      {activeTab === "donations" && <AdminDonationsTab />}

      {activeTab === "accounts" && <AdminAccountsTab />}

      {activeTab === "profiles" && <AdminProfileRequestsTab />}

      {activeTab === "management" && <AdminManagement user={user} />}

      {activeTab === "pending" && <PendingVerification user={user} />}
    </div>
  );
};
