import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { useLanguage } from "../components/LanguageContext.jsx";
import { API_BASE_URL } from "../utils/api.js";
import { Heart, ArrowLeft, Loader, AlertCircle, MapPin, Droplet, Users, Check } from "lucide-react";

export const RequestDetailPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, accessToken } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [unitsToAssign, setUnitsToAssign] = useState(1);
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

  // Fetch request details
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/requesters/${requestId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch request details");
        }

        const data = await response.json();
        setRequest(data);
      } catch (err) {
        console.error("Error fetching request:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (requestId && accessToken) {
      fetchRequest();
    }
  }, [requestId, accessToken]);

  const handleAssignSelf = async () => {
    if (!unitsToAssign || unitsToAssign <= 0) {
      alert(t("invalidUnits") || "Please select valid units");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/requesters/${requestId}/assign-self`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unitsRequested: unitsToAssign,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign yourself");
      }

      setAssigned(true);
      setShowUnitsModal(false);
      alert(t("donorAssignSuccess") || "Successfully assigned to request!");
      setTimeout(() => navigate("/donor-portal"), 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error("Error assigning:", err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={20} />
            {language === "ar" ? "العودة" : "Back"}
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-semibold text-red-800">{t("error")}</p>
              <p className="text-red-700">{error || "Request not found"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalAssigned = request.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
  const unitsRemaining = request.unitsNeeded - totalAssigned;
  const isUserInCoolDown = user?.status === "cool-down";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft size={20} />
          {language === "ar" ? "العودة" : "Back"}
        </button>

        {/* Cool-down Warning */}
        {isUserInCoolDown && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-orange-800 font-semibold">
                {language === "ar" ? "فترة انتظار نشطة" : "Waiting Period Active"}
              </p>
              <p className="text-orange-700 text-sm mt-1">
                {language === "ar"
                  ? `الوقت المتبقي: ${remainingDays} يوماً من 56 يوم`
                  : `Time remaining: ${remainingDays} of 56 days`}
              </p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {/* Header Card */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">
                {request.fname} {request.fatherName} {request.lname}
              </h1>
            </div>
            <Heart size={40} className="text-red-200 flex-shrink-0" />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Blood Type */}
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="flex flex-col items-center text-center gap-3">
              <Droplet className="text-red-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">{t("bloodType")}</p>
                <p className="font-bold text-red-600 text-lg">
                  {request.bloodType} ({request.bloodGenre})
                </p>
              </div>
            </div>
          </div>

          {/* Units Needed */}
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="flex flex-col items-center text-center gap-3">
              <Users className="text-blue-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">{t("unitsNeeded")}</p>
                <p className="font-bold text-blue-600 text-lg">{request.unitsNeeded}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "ar"
                    ? `${unitsRemaining} وحدة متبقية`
                    : `${unitsRemaining} units remaining`}
                </p>
              </div>
            </div>
          </div>

          {/* Hospital */}
          <div className="bg-white rounded-lg p-4 shadow md:col-span-2">
            <div className="flex flex-col items-center text-center gap-3">
              <MapPin className="text-green-600" size={24} />
              <div>
                <p className="text-gray-600 text-sm">{t("hospitalName")}</p>
                <p className="font-bold text-gray-800">{request.hospital}</p>
                {request.location && <p className="text-sm text-gray-600 mt-1">{request.location}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg p-4 items-center text-center shadow">
            <h3 className="font-bold text-gray-900 mb-3">
              {language === "ar" ? "حالة الطلب" : "Request Status"}
            </h3>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              request.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : request.status === "fulfilled"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}>
              {request.status}
            </span>
          </div>
          
          {/* Date Card */}
          <div className="bg-white rounded-lg p-4 items-center text-center shadow">
            <h3 className="font-bold text-gray-900 mb-3">
              {language === "ar" ? "تاريخ الطلب" : "Request Date"}
            </h3>
            <p className="text-gray-700">
              {new Date(request.createdAt).toLocaleDateString(
                language === "ar" ? "ar-SA" : "en-US"
              )}
            </p>
          </div>
        </div>

        {/* Assigned Donors */}
        {request.assignedDonors && request.assignedDonors.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow mb-6">
            <h3 className="font-bold text-center text-gray-900 mb-3">
              {language === "ar" ? "المتبرعون المعينون" : "Assigned Donors"} ({request.assignedDonors.length})
            </h3>
            <div className="space-y-2">
              {request.assignedDonors.map((donor, idx) => (
                <div key={idx} className="flex items-center justify-center p-2 bg-green-50 rounded">
                  <span className="text-sm text-gray-700">
                    {donor.donorName || "Anonymous"} - {donor.unitsAssigned} {language === "ar" ? "وحدة" : "units"}
                  </span>
                  <Check size={18} className="text-green-600 ml-2 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {request.description && (
          <div className="bg-white rounded-lg p-4 shadow mb-6">
            <h3 className="font-bold text-center text-gray-900 mb-2">
              {language === "ar" ? "ملاحظات" : "Notes"}
            </h3>
            <p className="text-gray-700 text-center">{request.description}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowUnitsModal(true)}
            disabled={assigned || isUserInCoolDown || unitsRemaining === 0}
            className={`py-3 px-8 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
              assigned
                ? "bg-green-500 text-white cursor-not-allowed"
                : isUserInCoolDown
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : unitsRemaining === 0
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600 active:scale-95"
            }`}
            title={
              isUserInCoolDown
                ? language === "ar"
                  ? "أنت في فترة انتظار"
                  : "You are in waiting period"
                : unitsRemaining === 0
                ? language === "ar"
                  ? "لا توجد وحدات متبقية"
                  : "No units remaining"
                : ""
            }
          >
            {assigned ? (
              <>
                <Check size={20} />
                {language === "ar" ? "تم التعيين" : "Assigned"}
              </>
            ) : (
              <>
                <Heart size={20} />
                {language === "ar" ? "تبرع الآن" : "Donate Now"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Units Modal */}
      {showUnitsModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-xl font-bold text-center text-gray-900 mb-4">
              {language === "ar" ? "اختر عدد الوحدات" : "Select Units"}
            </h3>
            <p className="text-sm text-center text-gray-600 mb-4">
              {language === "ar"
                ? `الحد الأقصى المتاح: ${unitsRemaining} وحدة`
                : `Maximum available: ${unitsRemaining} units`}
            </p>
            <input
              type="number"
              min="1"
              max={unitsRemaining}
              value={unitsToAssign}
              onChange={(e) => setUnitsToAssign(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-red-600 text-center"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnitsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleAssignSelf}
                disabled={assigning}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {assigning ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    {language === "ar" ? "جاري..." : "Assigning..."}
                  </>
                ) : (
                  language === "ar" ? "تبرع" : "Donate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
