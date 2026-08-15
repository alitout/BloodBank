import React, { useCallback, useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { Clock, CheckCircle } from "lucide-react";
import { authAPI, API_BASE_URL, getAccessToken } from "../utils/api.js";
import { useLocation } from "react-router-dom";
import { AdminProfileRequestsTab } from "./AdminProfileRequestsTab.jsx";
import AdminDonationApprovals from "./AdminDonationApprovals.jsx";
import AdminRequestApprovals from "./AdminRequestApprovals.jsx";

export const PendingVerification = () => {
  const { t, language } = useLanguage();
  const { user: authUser, accessToken } = useAuth();
  const [error, setError] = useState("");
  const { invalidateCache } = useDataCache();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const location = useLocation();

  const [pendingCounts, setPendingCounts,] = useState({ requestApprovals: 0, customHospitals: 0, profileRequests: 0, donations: 0, });
  const [countsLoading, setCountsLoading,] = useState({ requestApprovals: true, customHospitals: true, profileRequests: true, donations: true, });

  useEffect(() => {
    if (!accessToken) {
      setCountsLoading({
        requestApprovals: false,
        customHospitals: false,
        profileRequests: false,
        donations: false,
      });

      return undefined;
    }

    return undefined;
  }, [accessToken]);

  const handleRequestCountsChange =
    useCallback(
      ({
        requests,
        hospitals,
      }) => {
        setPendingCounts(
          (current) => ({
            ...current,

            requestApprovals:
              requests,

            customHospitals:
              hospitals,
          })
        );

        setCountsLoading(
          (current) => ({
            ...current,

            requestApprovals:
              false,

            customHospitals:
              false,
          })
        );
      },
      []
    );

  const handleProfileCountChange =
    useCallback(
      (count) => {
        setPendingCounts(
          (currentCounts) => ({
            ...currentCounts,
            profileRequests:
              count,
          })
        );

        setCountsLoading(
          (currentLoading) => ({
            ...currentLoading,
            profileRequests:
              false,
          })
        );
      },
      []
    );

  const handleDonationCountChange =
    useCallback(
      (count) => {
        setPendingCounts(
          (currentCounts) => ({
            ...currentCounts,
            donations:
              count,
          })
        );

        setCountsLoading(
          (currentLoading) => ({
            ...currentLoading,
            donations:
              false,
          })
        );
      },
      []
    );

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        getAccessToken() ||
        accessToken;

      if (!token) {
        throw new Error(
          "Authentication required"
        );
      }

      /*
       * Use the same endpoint as the
       * notification bell.
       */
      const response =
        await fetch(
          `${API_BASE_URL}/auth/admin/accounts`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                "application/json"
            }
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Failed to load pending accounts"
        );
      }

      const pending =
        Array.isArray(data)
          ? data.filter(
            (account) =>
              account.verifiedByAdmin !==
              true
          )
          : [];

      setPendingUsers(
        pending
      );
    } catch (fetchError) {
      console.error(
        "[PENDING VERIFICATION] Fetch error:",
        fetchError
      );

      setError(
        fetchError.message
      );

      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    fetchPendingUsers();
  }, [accessToken]);

  useEffect(() => {
    const section =
      new URLSearchParams(location.search).get("section");

    if (!section) {
      return;
    }

    window.setTimeout(() => {
      document
        .getElementById(section)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }, 150);
  }, [location.search, loading]);

  const handleVerify = async (uid) => {
    try {
      const result = await authAPI.verifyUser(uid);
      if (!result.success) {
        throw new Error(
          result.error ||
          "Failed to verify account"
        );
      }
      if (result.success) {
        setMessageType(
          "success"
        );

        setMessage(
          t("verificationSuccess")
        );

        setPendingUsers(
          (currentUsers) =>
            currentUsers.filter(
              (pendingUser) =>
                pendingUser.uid !== uid
            )
        );

        invalidateCache(
          authUser?.role,
          "pendingUsers"
        );

        window.dispatchEvent(
          new CustomEvent(
            "admin-pending-updated"
          )
        );

        setTimeout(() => {
          setMessage("");
          setMessageType("");
        }, 3000);
      }
      window.dispatchEvent(
        new CustomEvent("admin-pending-updated")
      );
    } catch (error) {
      setMessageType("error");
      setMessage(t("verificationError"));
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <a
          href="#pending-custom-hospitals"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-sm font-semibold text-amber-800">
            {t(
              "pendingCustomHospitals"
            )}
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-900">
            {countsLoading
              .customHospitals
              ? "…"
              : pendingCounts
                .customHospitals}
          </p>
        </a>

        <a
          href="#request-approvals"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-800">
            {t(
              "bloodRequestApprovals"
            )}
          </p>

          <p className="mt-2 text-3xl font-bold text-red-900">
            {countsLoading
              .requestApprovals
              ? "…"
              : pendingCounts
                .requestApprovals}
          </p>
        </a>

        <a
          href="#profile-requests"
          className="rounded-lg border border-purple-200 bg-purple-50 p-4"
        >
          <p className="text-sm font-semibold text-purple-800">
            {language === "ar"
              ? "طلبات تعديل وحذف الملف"
              : "Profile Requests"}
          </p>
          <p className="mt-2 text-3xl font-bold text-purple-900">
            {countsLoading.profileRequests ? "…" : pendingCounts.profileRequests}
          </p>
        </a>

        <a
          href="#donation-confirmations"
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-800">
            {language === "ar"
              ? "تأكيدات التبرع"
              : "Donation Confirmations"}
          </p>
          <p className="mt-2 text-3xl font-bold text-red-900">
            {countsLoading.donations ? "…" : pendingCounts.donations}
          </p>
        </a>

        <a
          href="#profile-verifications"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-sm font-semibold text-amber-800">
            {language === "ar"
              ? "التحقق من الحسابات"
              : "Profile Verifications"}
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {pendingUsers.length}
          </p>
        </a>
      </div>

      <section
        id="blood-request-approvals"
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          {t(
            "bloodRequestApprovals"
          )}{" "}
          (
          {countsLoading
            .requestApprovals
            ? "…"
            : pendingCounts
              .requestApprovals}
          )
        </h3>

        <AdminRequestApprovals
          onCountsChange={
            handleRequestCountsChange
          }
        />
      </section>

      <section
        id="profile-requests"
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          {language === "ar"
            ? `طلبات الملف الشخصي (${countsLoading.profileRequests ? "…" : pendingCounts.profileRequests})`
            : `Profile Requests (${countsLoading.profileRequests ? "…" : pendingCounts.profileRequests})`}
        </h3>

        <AdminProfileRequestsTab pendingOnly onPendingCountChange={handleProfileCountChange} />
      </section>

      <section
        id="donation-confirmations"
        className="scroll-mt-24"
      >
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          {language === "ar"
            ? `تأكيدات التبرع (${countsLoading.donations ? "…" : pendingCounts.donations})`
            : `Donation Confirmations (${countsLoading.donations ? "…" : pendingCounts.donations})`}
        </h3>

        <AdminDonationApprovals onPendingCountChange={handleDonationCountChange} />
      </section>
      <section
        id="profile-verifications"
        className="scroll-mt-24 space-y-4"
      >
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <Clock className="w-12 h-12 text-amber-200" />
            <div>
              <h3 className="text-xl font-bold">
                {t("pendingTab")}
              </h3>
              <p className="text-sm text-amber-100">
                {t("accountsPendingVerification")}
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg font-semibold ${messageType === "success"
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
            }`}>
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-8 text-slate-500">{t("loading")}</div>
        ) : pendingUsers.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-blue-900 font-semibold">
              {t("noPendingAccounts")}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 ">
                  <tr>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("name")}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("email")}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("type")}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("registrationDate")}</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">{t("action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingUsers.map(pUser => (
                    <tr key={pUser.uid} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-center">
                        <p className="font-semibold text-slate-900">
                          {pUser.role === "donor"
                            ? `${pUser.fname} ${pUser.lname}`
                            : pUser.role === "hospital"
                              ? pUser.hospitalName
                              : `${pUser.superAdminFName} ${pUser.superAdminLName}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">{pUser.email}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pUser.role === "donor" ? "bg-blue-100 text-blue-800" :
                          pUser.role === "hospital" ? "bg-red-100 text-red-800" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                          {t(`role_${pUser.role}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {new Date(pUser.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <button
                          onClick={() => handleVerify(pUser.uid)}
                          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition text-xs"
                        >
                          {t("verify")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
