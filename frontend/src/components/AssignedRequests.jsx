import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { CheckCircle, XCircle, Calendar, MapPin, Droplet, AlertCircle } from "lucide-react";

export const AssignedRequests = () => {
  const { user, accessToken } = useAuth();
  const { language } = useLanguage();
  // const { getCachedData } = useDataCache();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    fetchAssignedRequests();
  }, [accessToken]);

  const fetchAssignedRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getAccessToken();

      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/requesters/assigned-requests`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "No assigned requests found"
            : "Failed to fetch assigned requests"
        );
      }

      const data = await response.json();

      const assignedRequests = Array.isArray(data)
        ? data
        : data.requests || [];

      setRequests(assignedRequests);
    } catch (err) {
      console.error("Error fetching assigned requests:", err);
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDonation = async (requestId) => {
    if (!window.confirm(
      language === "ar"
        ? "هل تريد تأكيد إتمام التبرع؟"
        : "Are you sure you want to confirm the donation as completed?"
    )) {
      return;
    }

    try {
      setProcessingId(requestId);
      setError("");
      setSuccess("");
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch(
        `${API_BASE_URL}/requesters/${requestId}/complete-donation`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete donation");
      }

      const responseData = await response.json();
      const unitsCompleted = responseData.myAssignment?.unitsCompleted || 1;

      setSuccess(
        language === "ar"
          ? `✓ تم تأكيد ${unitsCompleted} وحدة بنجاح! سيتم نقلك إلى قائمة السجل في ثوان قليلة...`
          : `✓ ${unitsCompleted} unit(s) completed successfully! You will be redirected in a few seconds...`
      );

      // Remove the completed request from the list immediately
      setRequests(requests.filter(req => req._id !== requestId));

      // Reload page after 3 seconds to refresh user profile data
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelAssignment = async (requestId) => {
    if (!window.confirm(
      language === "ar"
        ? "هل تريد إلغاء التعيين؟"
        : "Are you sure you want to cancel this assignment?"
    )) {
      return;
    }

    try {
      setProcessingId(requestId);
      setError("");
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');

      const response = await fetch(
        `${API_BASE_URL}/requesters/${requestId}/cancel-assignment`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel assignment");
      }

      setSuccess(
        language === "ar"
          ? "✓ تم إلغاء التعيين بنجاح"
          : "✓ Assignment cancelled successfully"
      );

      // Refresh the requests list
      await fetchAssignedRequests();

      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-slate-600">
          {language === "ar" ? "جاري التحميل..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-12 text-center border border-slate-200">
          <Droplet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {language === "ar"
              ? "لا توجد طلبات معينة لك حالياً"
              : "No assigned requests at the moment"}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            {language === "ar"
              ? "عندما يتم تعيين طلب لك، سيظهر هنا"
              : "When a request is assigned to you, it will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request._id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 border-b border-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {request.fname} {request.fatherName} {request.lname}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-lg">
                      {request.bloodType}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50">
                {/* Blood Genre */}
                <div className="flex items-center gap-3">
                  <Droplet className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "نوع الدم" : "Blood Type"}
                    </p>
                    <p className="font-semibold text-slate-900 capitalize">
                      {request.bloodGenre?.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Units Needed */}
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "الوحدات المطلوبة" : "Units Needed"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {request.unitsNeeded} {language === "ar" ? "وحدة" : "units"}
                    </p>
                  </div>
                </div>

                {/* My Units */}
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "وحداتي" : "My Assignment"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {request.myAssignment?.unitsCompleted} / {request.myAssignment?.unitsAssigned}
                    </p>
                  </div>
                </div>

                {/* Hospital */}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "المستشفى" : "Hospital"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {request.hospital}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "التاريخ" : "Date"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {request.date}
                    </p>
                  </div>
                </div>

                {/* Total Donors */}
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "عدد المتبرعين" : "Total Donors"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {request.assignedDonors?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {request.description && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white">
                  <p className="text-xs text-slate-600 mb-1">
                    {language === "ar" ? "الملاحظات" : "Notes"}
                  </p>
                  <p className="text-slate-700">{request.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => handleCompleteDonation(request._id)}
                  disabled={processingId === request._id}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {language === "ar"
                    ? "تم التبرع"
                    : "Donation Done"}
                </button>
                <button
                  onClick={() => handleCancelAssignment(request._id)}
                  disabled={processingId === request._id}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
