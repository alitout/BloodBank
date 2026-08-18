import React, { useEffect, useRef, useState, } from "react";
import { Bell, Building2, CheckCircle, ClipboardCheck, Clock, Droplet, XCircle, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { API_BASE_URL, getAccessToken, } from "../utils/api.js";

export const NotificationBell = ({ isMobilePanel = false, notificationData }) => {
  const { language } = useLanguage();
  const { accessToken } = useAuth();
  const [showDropdown, setShowDropdown] = useState(isMobilePanel);
  const [processingId, setProcessingId] = useState(null);
  const dropdownRef = useRef(null);

  const {
    pendingAccounts = [],
    pendingDonations = [],
    pendingProfileRequests = [],
    pendingRequestApprovals = [],
    pendingCustomHospitals = [],
    pendingCount = 0,
    error: dataError = "",
    refetch,
    removePendingAccount,
    removePendingDonation,
  } = notificationData || {};

  const [actionError, setActionError,] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (isMobilePanel) {
      return undefined;
    }

    const handleClickOutside = (
      event
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener(
        "mousedown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [
    isMobilePanel,
    showDropdown,
  ]);

  const handleVerifyAccount =
    async (uid) => {
      try {
        setProcessingId(uid);
        setActionError("");

        const token =
          getAccessToken() ||
          accessToken;

        if (!token) {
          throw new Error(
            "Authentication required"
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/auth/admin/verify/${uid}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              verifiedByAdmin: true,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            "Failed to verify account"
          );
        }

        removePendingAccount?.(uid);
        await refetch?.();

      } catch (verifyError) {
        setActionError(
          verifyError.message
        );
      } finally {
        setProcessingId(null);
      }
    };

  const handleApproveDonation =
    async (donationId) => {
      const approved =
        window.confirm(
          language === "ar"
            ? "هل تريد الموافقة على إتمام هذا التبرع؟"
            : "Approve this donation completion?"
        );

      if (!approved) {
        return;
      }

      try {
        setProcessingId(
          donationId
        );

        setActionError("");

        const token =
          getAccessToken() ||
          accessToken;

        if (!token) {
          throw new Error(
            "Authentication required"
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/donations/admin/${donationId}/approve`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            "Failed to approve donation"
          );
        }

        removePendingDonation?.(donationId);
        await refetch?.();

        window.dispatchEvent(
          new CustomEvent(
            "pending-donations-updated"
          )
        );
      } catch (approveError) {
        console.error(
          "[NOTIFICATION BELL] Approval error:",
          approveError
        );

        setActionError(
          approveError.message
        );
      } finally {
        setProcessingId(null);
      }
    };

  const handleRejectDonation =
    async (donationId) => {
      const rejectionReason =
        window.prompt(
          language === "ar"
            ? "اكتب سبب رفض تأكيد التبرع:"
            : "Enter the rejection reason:"
        );

      if (
        rejectionReason === null
      ) {
        return;
      }

      const trimmedReason =
        rejectionReason.trim();

      if (!trimmedReason) {
        setActionError(
          language === "ar"
            ? "سبب الرفض مطلوب."
            : "A rejection reason is required."
        );

        return;
      }

      try {
        setProcessingId(
          donationId
        );

        setActionError("");

        const token =
          getAccessToken() ||
          accessToken;

        if (!token) {
          throw new Error(
            "Authentication required"
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/donations/admin/${donationId}/reject`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              rejectionReason:
                trimmedReason,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
            "Failed to reject donation"
          );
        }

        removePendingDonation?.(donationId);
        await refetch?.();
        window.dispatchEvent(
          new CustomEvent(
            "pending-donations-updated"
          )
        );
      } catch (rejectError) {
        console.error(
          "[NOTIFICATION BELL] Rejection error:",
          rejectError
        );

        setActionError(
          rejectError.message
        );
      } finally {
        setProcessingId(null);
      }
    };

  const openPendingSection = (
    section
  ) => {
    localStorage.setItem(
      "adminActiveTab",
      "pending"
    );

    navigate(
      `/admin?tab=pending&section=${encodeURIComponent(
        section
      )}`
    );

    if (!isMobilePanel) {
      setShowDropdown(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {!isMobilePanel && (
        <button
          type="button"
          onClick={() =>
            setShowDropdown(
              (current) => !current
            )
          }
          className="relative p-2 text-slate-600 hover:text-slate-900"
          aria-label={
            language === "ar"
              ? "الإشعارات"
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />

          {pendingCount > 0 && (
            <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
              {pendingCount > 99
                ? "99+"
                : pendingCount}
            </span>
          )}
        </button>
      )}

      {showDropdown && (
        <div
          className={
            isMobilePanel
              ? "w-full bg-white"
              : "absolute right-0 z-50 mt-2 max-h-[32rem] w-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          }
        >
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">
              {language === "ar"
                ? "الإشعارات المعلقة"
                : "Pending Notifications"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {language === "ar"
                ? `${pendingCount} عنصر بانتظار الإجراء`
                : `${pendingCount} item(s) waiting for action`}
            </p>
          </div>

          {(actionError || dataError) && (
            <div className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {actionError || dataError}
            </div>
          )}

          <div className="divide-y divide-slate-200">
            {/* Custom hospitals requiring admin completion */}
            {pendingCustomHospitals.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPendingSection(
                    "pending-custom-hospitals"
                  )
                }
                className="w-full p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {language === "ar"
                        ? "مستشفيات بانتظار الاستكمال"
                        : "Hospitals awaiting completion"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {language === "ar"
                        ? `${pendingCustomHospitals.length} مستشفى معلق`
                        : `${pendingCustomHospitals.length} pending hospital(s)`}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-blue-700">
                      {language === "ar"
                        ? "اضغط للمراجعة"
                        : "Click to review"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Blood requests awaiting admin approval */}
            {pendingRequestApprovals.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPendingSection(
                    "request-approvals"
                  )
                }
                className="w-full p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {language === "ar"
                        ? "طلبات دم بانتظار الموافقة"
                        : "Blood requests awaiting approval"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {language === "ar"
                        ? `${pendingRequestApprovals.length} طلب معلق`
                        : `${pendingRequestApprovals.length} pending request(s)`}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-red-700">
                      {language === "ar"
                        ? "اضغط للمراجعة"
                        : "Click to review"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Pending profile update/deletion requests */}
            {pendingProfileRequests.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPendingSection(
                    "profile-requests"
                  )
                }
                className="w-full p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {language === "ar"
                        ? "طلبات الملف الشخصي بانتظار الإجراء"
                        : "Profile requests awaiting action"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {language === "ar"
                        ? `${pendingProfileRequests.length} طلب معلق`
                        : `${pendingProfileRequests.length} pending request(s)`}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-purple-700">
                      {language === "ar"
                        ? "اضغط للمراجعة"
                        : "Click to review"}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Pending donation confirmations */}
            {pendingDonations.map(
              (donation) => {
                const donor =
                  donation.donor || {};

                const request =
                  donation.requestId ||
                  {};

                const isProcessing =
                  processingId ===
                  donation.donationId;

                return (
                  <div
                    key={
                      donation._id ||
                      donation.donationId
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openPendingSection(
                        "donation-confirmations"
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        openPendingSection(
                          "donation-confirmations"
                        );
                      }
                    }}
                    className="cursor-pointer p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <Droplet className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {language === "ar"
                            ? "تأكيد تبرع بانتظار الموافقة"
                            : "Donation confirmation awaiting approval"}
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {donor.fname}{" "}
                          {donor.lname}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {request.hospital ||
                            "—"}
                          {" • "}
                          {donation.unitsCompleted ||
                            donation.unitsAssigned ||
                            0}{" "}
                          {language === "ar"
                            ? "وحدة"
                            : "unit(s)"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {language === "ar"
                            ? "المريض: "
                            : "Patient: "}

                          {request.fname}{" "}
                          {request.lname}
                        </p>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              handleApproveDonation(
                                donation.donationId
                              );
                            }}
                            disabled={
                              isProcessing
                            }
                            className="flex items-center gap-1 rounded bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />

                            {language === "ar"
                              ? "موافقة"
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              handleRejectDonation(
                                donation.donationId
                              );
                            }}
                            disabled={
                              isProcessing
                            }
                            className="flex items-center gap-1 rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />

                            {language === "ar"
                              ? "رفض"
                              : "Reject"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}

            {/* Pending account verification */}
            {pendingAccounts.map(
              (account) => (
                <div
                  key={account.uid}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    openPendingSection(
                      "profile-verifications"
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      openPendingSection(
                        "profile-verifications"
                      );
                    }
                  }}
                  className="cursor-pointer p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {language === "ar"
                          ? "حساب بانتظار التحقق"
                          : "Account awaiting verification"}
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {account.email}
                      </p>

                      <p className="text-xs text-slate-500">
                        {account.role}
                      </p>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          handleVerifyAccount(
                            account.uid
                          );
                        }}
                        disabled={
                          processingId ===
                          account.uid
                        }
                        className="mt-2 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {language === "ar"
                          ? "التحقق الآن"
                          : "Verify Now"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {pendingCount === 0 && (
              <div className="p-5 text-center text-sm text-slate-500">
                {language === "ar"
                  ? "لا توجد إشعارات معلقة"
                  : "No pending notifications"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};