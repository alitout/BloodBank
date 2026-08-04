import React, { useState, useEffect } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Heart, Loader, AlertCircle, Check, Droplet, MapPin, Users, Eye } from "lucide-react";

export const DonorAvailableRequests = () => {
  const { t, language } = useLanguage();
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [availableRequests, setAvailableRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedRequests, setAssignedRequests] = useState(new Set());
  const [assigningId, setAssigningId] = useState(null);
  const [remainingDays, setRemainingDays] = useState(0);

  // Calculate remaining cool-down days
  useEffect(() => {
    if (user?.status === "cool-down" && user?.lastDonationDate) {
      const lastDonation = new Date(user.lastDonationDate);
      const coolDownEnd = new Date(lastDonation.getTime() + 56 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const daysRemaining = Math.ceil((coolDownEnd - today) / (1000 * 60 * 60 * 24));
      setRemainingDays(Math.max(0, daysRemaining));
    }
  }, [user]);

  useEffect(() => {
    if (!accessToken) return;
    fetchAvailableRequests();
  }, [accessToken]);

  const fetchAvailableRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      const response = await fetch(`${API_BASE_URL}/requesters/available-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch available requests");
      }

      const data = await response.json();
      setAvailableRequests(data.availableRequests || []);
    } catch (err) {
      console.error("Error fetching available requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSelf = async (requestId) => {
    if (assignedRequests.has(requestId)) return;

    setAssigningId(requestId);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No authentication token found.');
      const response = await fetch(`${API_BASE_URL}/requesters/${requestId}/assign-self`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign yourself");
      }

      // Mark as assigned and show success
      setAssignedRequests(new Set([...assignedRequests, requestId]));
      alert(t("donorAssignSuccess"));

      // Refresh the list after 2 seconds
      setTimeout(() => {
        fetchAvailableRequests();
      }, 2000);
    } catch (err) {
      alert(`${t("error")}: ${err.message}`);
      console.error("Error assigning self:", err);
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" size={20} />
        <div>
          <p className="font-semibold text-red-800">{t("error")}</p>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cool-down Warning */}
      {user?.status === "cool-down" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-orange-800 font-semibold text-sm">
              {language === "ar" ? "فترة انتظار نشطة" : "Waiting Period Active"}
            </p>
            <p className="text-orange-700 text-sm mt-1">
              {language === "ar"
                ? `الوقت المتبقي: ${remainingDays} يوماً من 56 يوم`
                : `Time remaining: ${remainingDays} of 56 days`}
            </p>
            <p className="text-orange-700 text-xs mt-1">
              {language === "ar"
                ? "لن تتمكن من التبرع حتى انتهاء فترة الانتظار."
                : "You will not be able to donate until the waiting period ends."}
            </p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-semibold">
          {/* {language === "ar"
            ? `${availableRequests.length} طلب متاح يتطابق مع فئة دمك (${user?.bloodType || ""})`
            : `${availableRequests.length} available request${
                availableRequests.length !== 1 ? "s" : ""
              } matching your blood type (${user?.bloodType || ""})`} */}
          {t("availableRequestsCount", { count: availableRequests.length, bloodType: user?.bloodType || "" })}
        </p>
      </div>

      {/* Empty State */}
      {availableRequests.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <Heart size={60} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg">
            {t("noAvailableRequests")}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {t("notifyOnNewRequests")}
          </p>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableRequests.map((request) => (
            <div
              key={request._id}
              className={`rounded-lg border-2 transition transform hover:scale-105 ${
                assignedRequests.has(request._id)
                  ? "border-green-500 bg-green-50"
                  : "border-red-200 bg-white hover:border-red-400 shadow-md hover:shadow-lg"
              }`}
            >
              {/* Card Header */}
              <div
                className={`px-4 py-3 ${
                  assignedRequests.has(request._id)
                    ? "bg-green-100 border-b border-green-200"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    {request.fname} {request.lname}
                  </h3>
                  {assignedRequests.has(request._id) && (
                    <Check size={24} className="text-green-600" />
                  )}
                </div>
                <p className={`text-sm ${
                  assignedRequests.has(request._id)
                    ? "text-green-700"
                    : "text-red-100"
                }`}>
                  {request.fatherName}
                </p>
              </div>

              {/* Card Body */}
              <div className="px-4 py-4 space-y-3">
                {/* Blood Type & Genre */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <Droplet className="text-red-600" size={20} />
                  <div>
                    <p className="text-xs text-gray-600">
                      {t("bloodType")}
                    </p>
                    <p className="font-bold text-red-600">
                      {request.bloodType} ({request.bloodGenre})
                    </p>
                  </div>
                </div>

                {/* Hospital & Location */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <MapPin className="text-blue-600" size={20} />
                  <div>
                    <p className="text-xs text-gray-600">
                      {t("hospitalName")}
                    </p>
                    <p className="font-semibold text-gray-800">{request.hospital}</p>
                  </div>
                </div>

                {/* Units Needed */}
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <Users className="text-purple-600" size={20} />
                  <div>
                    <p className="text-xs text-gray-600">
                      {t("unitsNeeded")}
                    </p>
                    <p className="font-bold text-purple-600">{request.unitsNeeded}</p>
                  </div>
                </div>

                {/* Request Details */}
                {request.description && (
                  <div className="p-2 bg-blue-50 rounded border border-blue-100">
                    <p className="text-xs text-gray-600 mb-1">
                      {t("notes")}
                    </p>
                    <p className="text-sm text-gray-700">{request.description}</p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/request-detail/${request._id}`)}
                    className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                  >
                    <Eye size={16} />
                    {language === "ar" ? "عرض" : "View"}
                  </button>
                  {user?.status === "cool-down" ? (
                    <div className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-gray-300 text-gray-600 cursor-not-allowed" title={language === "ar" ? "أنت في فترة انتظار" : "You are in waiting period"}>
                      <AlertCircle size={16} />
                      {language === "ar" ? "في فترة انتظار" : "In Waiting Period"}
                    </div>
                  ) : (
                    <button
                      onClick={() => !assignedRequests.has(request._id) && !assigningId && handleAssignSelf(request._id)}
                      disabled={assignedRequests.has(request._id) || assigningId === request._id}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
                        assignedRequests.has(request._id)
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : assigningId === request._id
                          ? "bg-blue-500 text-white opacity-70"
                          : "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                      }`}
                    >
                      {assignedRequests.has(request._id) ? (
                        <>
                          <Check size={16} />
                          {t("assigned")}
                        </>
                      ) : assigningId === request._id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {t("assigning")}
                        </>
                      ) : (
                        <>
                          <Heart size={16} />
                          {t("donateNow")}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
