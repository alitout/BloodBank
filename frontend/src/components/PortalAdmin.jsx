import React from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useDB } from "./DBContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useLocation } from "react-router-dom";
import { BarChart3, Users, Activity, CheckCircle, Settings, Clock } from "lucide-react";
import { AdminManagement } from "./AdminManagement.jsx";
import { PendingVerification } from "./PendingVerification.jsx";
import { AdminHospitalsTab } from "./AdminHospitalsTab.jsx";
import { AdminAccountsTab } from "./AdminAccountsTab.jsx";
import { AdminRequestsTab } from "./AdminRequestsTab.jsx";
import AdminDonationsTab from "./AdminDonationsTab.jsx";

export const PortalAdmin = ({ user }) => {
  const { t, language } = useLanguage();
  const { requesters, donors, hospitals, appointments, updateRequesterStatus, fetchAdminData, refreshData, isLoading } = useDB();
  const { accounts } = useAuth();
  const location = useLocation();

  const validAdminTabs = [
    "overview",
    "requests",
    "hospitals",
    "donations",
    "accounts",
    "management",
    "pending",
  ];

  const requestedTab =
    new URLSearchParams(
      location.search
    ).get("tab");

  const activeTab =
    validAdminTabs.includes(
      requestedTab
    )
      ? requestedTab
      : "overview";


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


  const pendingRequests = requesters.filter(r => r.status === "pending");
  const fulfilledRequests = requesters.filter(r => r.status === "fulfilled");

  return (
    <div className="space-y-6">
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

      {activeTab === "management" && <AdminManagement user={user} />}

      {activeTab === "pending" && <PendingVerification />}
    </div>
  );
};
