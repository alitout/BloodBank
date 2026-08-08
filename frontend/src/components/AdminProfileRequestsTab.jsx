import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Check, X, User, Trash2 } from "lucide-react";
import { ConfigurableTable } from "./ConfigurableTable.jsx";

export const AdminProfileRequestsTab = ({ pendingOnly = false }) => {
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const { getCachedData, invalidateCache } = useDataCache();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfileRequests();
  }, []);

  const fetchProfileRequests = async () => {
    try {
      // Check cache first
      const cachedRequests = getCachedData(user?.role, 'profileRequests');
      if (cachedRequests) {
        setRequests(Array.isArray(cachedRequests) ? cachedRequests : []);
        setLoading(false);
        return;
      }

      // Fallback to fetch if cache empty
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      const response = await fetch(`${API_BASE_URL}/auth/profile-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch profile requests");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching profile requests:", err);
    } finally {
      setLoading(false);
    }
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
      fetchProfileRequests();

      window.dispatchEvent(
        new CustomEvent("admin-pending-updated")
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
      invalidateCache(user?.role, "profileRequests");
      await fetchProfileRequests();

      window.dispatchEvent(
        new CustomEvent("admin-pending-updated")
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
          <div className="text-sm">
            {Object.keys(changes || {})
              .map((key) => `${key}: ${changes[key]}`)
              .join(", ")}
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
      visible: false,
      render: (date) => new Date(date).toLocaleDateString(),
    },
  ];

  const pendingRequests = requests.filter((r) => r.status === "pending");

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
      disabled: (row) => row.status !== "pending",
    },
    {
      label: t("reject"),
      icon: X,
      onClick: (request) => {
        if (
          confirm(
            t("confirmRejectRequest")
          )
        ) {
          handleReject(request._id || request.id);
        }
      },
      className: "text-red-600 hover:text-red-800 p-1",
      disabled: (row) => row.status !== "pending",
    },
  ];

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-lg p-8 border border-slate-200 text-center">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">
            {t("noPendingRequests")}
          </p>
        </div>
      ) : (
        <ConfigurableTable
          columns={columns}
          data={pendingOnly ? pendingRequests : requests}
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
