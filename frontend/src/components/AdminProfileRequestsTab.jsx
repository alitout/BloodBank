import React, { useCallback, useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Check, X, User, } from "lucide-react";
import { ConfigurableTable } from "./ConfigurableTable.jsx";
import { formatDateDDMMYYYY, } from "../utils/dateFormat.js";

export const AdminProfileRequestsTab = ({ pendingOnly = false, onPendingCountChange, }) => {
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const { getCachedData, invalidateCache } = useDataCache();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const requestInProgressRef = useRef(false);
  const componentMountedRef = useRef(true);
  const refreshQueuedRef = useRef(false);

  useEffect(() => {
    componentMountedRef.current =
      true;

    return () => {
      componentMountedRef.current =
        false;
    };
  }, []);

  useEffect(() => {
    const safeRequests =
      Array.isArray(requests)
        ? requests
        : [];

    const pendingCount =
      safeRequests.filter(
        (request) =>
          request?.status ===
          "pending"
      ).length;

    onPendingCountChange?.(
      pendingCount
    );
  }, [
    requests,
    onPendingCountChange,
  ]);

  const fetchProfileRequests =
    useCallback(
      async ({ forceRefresh = false, showLoader = false, } = {}) => {

        if (requestInProgressRef.current) {
          refreshQueuedRef.current = true;

          return;
        }

        requestInProgressRef.current = true;

        try {
          if (showLoader) {
            setLoading(true);
          }

          if (!forceRefresh) {
            const cachedRequests =
              getCachedData(
                user?.role,
                "profileRequests"
              );

            if (
              Array.isArray(
                cachedRequests
              )
            ) {
              if (
                componentMountedRef.current
              ) {
                setRequests(
                  Array.isArray(cachedRequests)
                    ? cachedRequests
                    : []
                );

                setLoading(false);
              }

            }
          }

          const token =
            getAccessToken() ||
            accessToken;

          if (!token) {
            throw new Error(
              "Authentication required"
            );
          }

          const response =
            await fetch(
              `${API_BASE_URL}/auth/profile-requests`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
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
              data?.message ||
              "Failed to fetch profile requests"
            );
          }

          const receivedRequests =
            Array.isArray(data)
              ? data
              : Array.isArray(
                data?.requests
              )
                ? data.requests
                : [];

          if (componentMountedRef.current) {
            setRequests(
              Array.isArray(receivedRequests)
                ? receivedRequests
                : []
            );

            setError("");
          }
        } catch (fetchError) {
          console.error(
            "[PROFILE REQUESTS] Refresh error:",
            fetchError
          );

          if (componentMountedRef.current) {
            setError(fetchError.message);
          }
        } finally {
          requestInProgressRef.current =
            false;

          if (
            componentMountedRef.current
          ) {
            setLoading(false);
          }

          const shouldRefreshAgain =
            refreshQueuedRef.current;

          refreshQueuedRef.current =
            false;

          if (
            shouldRefreshAgain &&
            componentMountedRef.current
          ) {
            window.setTimeout(
              () => {
                fetchProfileRequests({
                  forceRefresh: true,
                  showLoader: false,
                });
              },
              0
            );
          }
        }
      },
      [accessToken, getCachedData, user?.role,]
    );

  useEffect(() => {
    fetchProfileRequests({
      showLoader: true,
    });
    const intervalId =
      window.setInterval(
        () => {
          fetchProfileRequests({
            forceRefresh: true,
            showLoader: false,
          });
        },
        10000
      );

    const handlePendingUpdate =
      () => {
        fetchProfileRequests({
          forceRefresh: true,
          showLoader: false,
        });
      };

    window.addEventListener(
      "admin-pending-updated",
      handlePendingUpdate
    );

    return () => {
      window.clearInterval(
        intervalId
      );

      window.removeEventListener(
        "admin-pending-updated",
        handlePendingUpdate
      );
    };
  }, [fetchProfileRequests]);

  const handleRequestProcessed = async (requestId, status) => {
    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        (request._id || request.id) ===
          requestId
          ? {
            ...request,
            status,
          }
          : request
      )
    );

    invalidateCache(
      user?.role,
      "profileRequests"
    );

    window.dispatchEvent(
      new CustomEvent(
        "admin-pending-updated",
        {
          detail: {
            type: "profile_request",
            requestId,
            status,
          },
        }
      )
    );

    await fetchProfileRequests({
      forceRefresh: true,
      showLoader: false,
    });
  };

  const handleApprove = async (requestId) => {
    setActionLoading(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/auth/profile-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!response.ok) throw new Error("Failed to approve request");
      setError("");

      await handleRequestProcessed(
        requestId,
        "approved"
      );

    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const rejectionReason = window.prompt(
      language === "ar"
        ? "اكتب سبب رفض طلب تعديل الملف الشخصي:"
        : "Enter the reason for rejecting this profile request:"
    );

    if (rejectionReason === null) {
      return;
    }

    const trimmedReason = rejectionReason.trim();

    if (!trimmedReason) {
      setError(
        language === "ar"
          ? "سبب الرفض مطلوب."
          : "A rejection reason is required."
      );
      return;
    }

    setActionLoading(true);

    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("No authentication token found.");
      }

      const response = await fetch(
        `${API_BASE_URL}/auth/profile-requests/${requestId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: "rejected",
            rejectionReason: trimmedReason
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to reject request");
      }

      setError("");

      await handleRequestProcessed(
        requestId,
        "rejected"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getRequestTypeDisplay = (type) => {
    const typeMap = {
      profile_update: t("profileUpdate"),
      account_deletion: t("accountDeletion"),
    };
    return typeMap[type] || type;
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProfileFieldLabel = (
    field
  ) => {
    const translatedLabel =
      t(field);

    return translatedLabel === field
      ? field
      : translatedLabel;
  };

  const formatProfileChangeValue = (
    field,
    value
  ) => {
    if (field === "dateOfBirth") {
      return (
        formatDateDDMMYYYY(value) ||
        t("notProvided")
      );
    }

    if (
      field === "biologicalSex"
    ) {
      return t(value);
    }

    return String(value ?? "");
  };

  const columns = [
    {
      key: "email",
      label: t("email"),
      visible: true,
    },
    {
      key: "requestType",
      label: t("requestType"),
      visible: true,
      render: (type) => getRequestTypeDisplay(type),
    },
    {
      key: "changes",
      label: t("details"),
      visible: true,
      render: (changes, row) => {
        if (row.requestType === "account_deletion") {
          return (
            <div className="text-sm">
              {row.reason || t("noReasonProvided")}
            </div>
          );
        }
        return (
          <div className="space-y-1 text-sm">
            {Object.entries(
              changes || {}
            ).map(([field, value]) => (
              <div key={field}>
                <span className="font-semibold">
                  {getProfileFieldLabel(
                    field
                  )}
                  :
                </span>{" "}
                <span>
                  {formatProfileChangeValue(
                    field,
                    value
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      label: t("status"),
      visible: true,
      render: (status) => (
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(status)}`}>
          {status?.toUpperCase()}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: t("date"),
      visible: true,
      render: (date) =>
        formatDateDDMMYYYY(date),
    },
  ];

  // const pendingRequests = requests.filter((r) => r.status === "pending");
  const safeRequests =
    Array.isArray(requests)
      ? requests
      : [];

  const pendingRequests =
    safeRequests.filter(
      (request) =>
        request?.status ===
        "pending"
    );

  const displayedRequests =
    pendingOnly
      ? pendingRequests
      : safeRequests;

  const actions = [
    {
      label: t("approve"),
      icon: Check,
      onClick: (request) => {
        if (
          confirm(
            t("confirmApproveRequest")
          )
        ) {
          handleApprove(request._id || request.id);
        }
      },
      className: "text-green-600 hover:text-green-800 p-1",
      disabled: (row) =>
        actionLoading ||
        row.status !== "pending",
    },
    {
      label: t("reject"),
      icon: X,

      onClick: (request) => {
        handleReject(
          request._id ||
          request.id
        );
      },

      className:
        "text-red-600 hover:text-red-800 p-1",

      disabled: (row) =>
        actionLoading ||
        row.status !== "pending",
    },
  ];

  if (
    loading &&
    displayedRequests.length === 0
  ) {
    return (
      <div className="py-8 text-center text-slate-500">
        {t("loading")}
      </div>
    );
  }

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      {displayedRequests.length === 0 ? (
        <div className="bg-white rounded-lg p-8 border border-slate-200 text-center">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">
            {t("noPendingRequests")}
          </p>
        </div>
      ) : (
        <ConfigurableTable
          columns={columns}
          data={displayedRequests}
          title={t("profileChangeRequests")}
          actions={actions}
          searchableFields={["email", "requestType"]}
          filterOptions={{
            status: ["pending", "approved", "rejected"],
            requestType: ["profile_update", "account_deletion"],
          }}
        />
      )}
    </div>
  );
};
