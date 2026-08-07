import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useDB } from "./DBContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { useNavigate } from "react-router-dom";
import { Heart, Loader, AlertCircle, Check, Droplet, MapPin, Users, Search, Filter, Lock, Eye } from "lucide-react";

export const RequestsList = () => {
  const { t, language } = useLanguage();
  const { accessToken, user, refreshUserProfile } = useAuth();
  const { requesters } = useDB();
  const { getCachedData } = useDataCache();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedRequests, setAssignedRequests] = useState(new Set());
  const [assigningId, setAssigningId] = useState(null);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [selectedRequestForUnits, setSelectedRequestForUnits] = useState(null);
  const [unitsToAssign, setUnitsToAssign] = useState(1);
  const [showOnlyCorrespondent, setShowOnlyCorrespondent] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const cooldownInformation = useMemo(() => {
    if (
      user?.status !== "cool-down" ||
      !user?.nextEligibleDate
    ) {
      return {
        isInCoolDown: false,
        nextEligibleDate: null,
        remainingDays: 0,
        formattedNextEligibleDate: null,
      };
    }

    const nextEligibleDate = new Date(
      user.nextEligibleDate
    );

    if (
      Number.isNaN(
        nextEligibleDate.getTime()
      )
    ) {
      return {
        isInCoolDown: false,
        nextEligibleDate: null,
        remainingDays: 0,
        formattedNextEligibleDate: null,
      };
    }

    const difference =
      nextEligibleDate.getTime() -
      Date.now();

    if (difference <= 0) {
      return {
        isInCoolDown: false,
        nextEligibleDate,
        remainingDays: 0,
        formattedNextEligibleDate: null,
      };
    }

    return {
      isInCoolDown: true,

      nextEligibleDate,

      remainingDays: Math.max(
        1,
        Math.ceil(
          difference /
          (24 * 60 * 60 * 1000)
        )
      ),

      formattedNextEligibleDate:
        nextEligibleDate.toLocaleDateString(
          language === "ar"
            ? "ar-LB"
            : "en-GB",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        ),
    };
  }, [
    user?.status,
    user?.nextEligibleDate,
    language,
  ]);

  const {
    isInCoolDown,
    remainingDays,
    formattedNextEligibleDate,
  } = cooldownInformation;

  // Check cache first and load initial data
  useEffect(() => {
    const cachedRequests = getCachedData(user?.role, 'availableRequests');
    if (cachedRequests && Array.isArray(cachedRequests)) {
      setLoading(false);
    }
  }, [user?.role, getCachedData]);

  useEffect(() => {
    if (
      typeof refreshUserProfile !==
      "function"
    ) {
      return undefined;
    }

    refreshUserProfile();

    const intervalId =
      window.setInterval(() => {
        refreshUserProfile();
      }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshUserProfile]);


  // Blood type compatibility check
  const isCompatibleDonor = (requiredBloodType, donorBloodType) => {
    const compatibility = {
      "O+": ["O+", "A+", "B+", "AB+"],
      "O-": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
      "A+": ["A+", "AB+"],
      "A-": ["A+", "A-", "AB+", "AB-"],
      "B+": ["B+", "AB+"],
      "B-": ["B+", "B-", "AB+", "AB-"],
      "AB+": ["AB+"],
      "AB-": ["AB+", "AB-"],
    };
    return compatibility[donorBloodType]?.includes(requiredBloodType) || false;
  };

  // Filter logic
  const filteredRequests = requesters.filter((req) => {
    const fullName = `${req.fname || ""} ${req.fatherName || ""} ${req.lname || ""}`.toLowerCase();
    const hospital = (req.hospital || "").toLowerCase();
    const bloodType = req.bloodType || "";
    const status = req.status || "";

    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      hospital.includes(searchTerm.toLowerCase()) ||
      bloodType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBloodType =
      bloodTypeFilter === "all" || bloodType === bloodTypeFilter;

    // Only show active (pending) requests to users
    const matchesStatus =
      statusFilter === "all" ? status === "pending" : status === statusFilter;

    const matchesCorrespondent =
      !showOnlyCorrespondent ||
      isCompatibleDonor(bloodType, user?.bloodType || "");

    // Check if request has available units
    const totalAssigned = req.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
    const hasAvailableUnits = totalAssigned < req.unitsNeeded;

    return matchesSearch && matchesBloodType && matchesStatus && matchesCorrespondent && hasAvailableUnits;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'fulfilled': return 'bg-green-50 border-green-200 text-green-700';
      case 'cancelled': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const handleAssignSelf = async (requestId, unitsCount) => {
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
        body: JSON.stringify({
          unitsRequested: unitsCount || 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign yourself");
      }

      setAssignedRequests(new Set([...assignedRequests, requestId]));
      alert(t("donorAssignSuccess"));
      setShowUnitsModal(false);
      setSelectedRequestForUnits(null);
      setUnitsToAssign(1);
    } catch (err) {
      alert(`${t("error")}: ${err.message}`);
      console.error("Error assigning self:", err);
    } finally {
      setAssigningId(null);
    }
  };

  const openUnitsModal = (request) => {
    const totalAssigned = request.assignedDonors?.reduce((sum, d) => sum + d.unitsAssigned, 0) || 0;
    const maxAvailable = request.unitsNeeded - totalAssigned;
    setSelectedRequestForUnits({ ...request, maxAvailable });
    setUnitsToAssign(Math.min(1, maxAvailable));
    setShowUnitsModal(true);
  };

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
      {/* Verification Warning */}
      {!user?.verifiedByAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-yellow-800 font-semibold text-sm">
              {language === "ar" ? "حساب غير موثق" : "Account Not Verified"}
            </p>
            <p className="text-yellow-700 text-sm">
              {language === "ar"
                ? "يجب أن يتم التحقق من حسابك بواسطة المسؤول قبل أن تتمكن من التبرع بالدم."
                : "Your account must be verified by an admin before you can donate blood."}
            </p>
          </div>
        </div>
      )}

      {/* Cool-down Status Warning */}
      {isInCoolDown && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />

          <div>
            <p className="text-sm font-semibold text-orange-800">
              {language === "ar"
                ? "فترة انتظار نشطة"
                : "Waiting Period Active"}
            </p>

            <p className="mt-1 text-sm text-orange-700">
              {language === "ar"
                ? `الوقت المتبقي: ${remainingDays} يوم`
                : `Time remaining: ${remainingDays} day${remainingDays === 1
                  ? ""
                  : "s"
                }`}
            </p>

            {formattedNextEligibleDate && (
              <p className="mt-1 text-sm text-orange-700">
                {language === "ar"
                  ? `يمكنك التبرع مجدداً ابتداءً من: ${formattedNextEligibleDate}`
                  : `You can donate again starting: ${formattedNextEligibleDate}`}
              </p>
            )}

            <p className="mt-1 text-xs text-orange-700">
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
          {language === "ar"
            ? `${filteredRequests.length} من ${requesters.length} طلب`
            : `${filteredRequests.length} of ${requesters.length} request${requesters.length !== 1 ? "s" : ""
            }`}
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {language === "ar" ? "الطلبات" : "Requests"}
          </h3>
          <Filter size={20} className="text-slate-600" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t("searchPlaceholder") || "Search by name or hospital..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={bloodTypeFilter}
            onChange={(e) => setBloodTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          >
            <option value="all">{t("bloodType")} - {t("all")}</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
          >
            <option value="all">{t("status")} - {t("all")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="fulfilled">{t("fulfilled")}</option>
            <option value="cancelled">{t("cancelled")}</option>
          </select>

          <label className="flex items-center gap-2 p-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showOnlyCorrespondent}
              onChange={(e) => setShowOnlyCorrespondent(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-600"
            />
            <span className="text-sm font-medium text-slate-700">
              {language === "ar"
                ? "متوافقة فقط"
                : "Compatible Only"}
            </span>
          </label>
        </div>

        {user?.role === "donor" && (
          <div className="text-sm text-slate-600 p-2 bg-blue-50 rounded-lg border border-blue-200">
            {language === "ar"
              ? `فصيلة دمك: ${user?.bloodType || "غير محدد"}`
              : `Your blood type: ${user?.bloodType || "Not specified"}`}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <Heart size={60} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg">
            {language === "ar" ? "لا توجد طلبات" : "No requests found"}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {language === "ar"
              ? "حاول تغيير المرشحات"
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        /* Requests Display */
        <div className="space-y-3">
          {filteredRequests.map(req => (
            <div key={req.id || req._id} className={`p-4 border rounded-lg ${getStatusColor(req.status)}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold">
                    {req.fname} {req.fatherName} {req.lname}
                  </h4>
                  <p className="text-sm">{req.hospital}</p>
                </div>
                <span className="text-2xl font-bold">{req.bloodType}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>{t("units")}: {req.unitsNeeded}</div>
                <div>{t("date")}: {req.date}</div>
                <div className="capitalize">{t(req.status)}</div>
              </div>
              {req.description && (
                <p className="text-xs mb-3 italic">{req.description}</p>
              )}
              {user?.role === "donor" && req.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/request-detail/${req._id}`)}
                    className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
                  >
                    <Eye size={16} />
                    {language === "ar" ? "عرض" : "View"}
                  </button>
                  <>
                    {user?.verifiedByAdmin && !isInCoolDown ? (
                      <button
                        onClick={() => !assignedRequests.has(req._id) && !assigningId && openUnitsModal(req)}
                        disabled={assignedRequests.has(req._id) || assigningId === req._id}
                        className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${assignedRequests.has(req._id)
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : assigningId === req._id
                            ? "bg-blue-500 text-white opacity-70"
                            : "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                          }`}
                      >
                        {assignedRequests.has(req._id) ? (
                          <>
                            <Check size={16} />
                            {t("assigned")}
                          </>
                        ) : assigningId === req._id ? (
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
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-2 px-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-gray-300 text-gray-600 cursor-not-allowed"
                        title={language === "ar" ? (isInCoolDown ? "أنت في فترة الانتظار" : "تحقق من حسابك أولاً") : (isInCoolDown ? "You are in a waiting period" : "Verify your account first")}
                      >
                        <Lock size={16} />
                        {t("donateNow")}
                      </button>
                    )}
                  </>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Units Selection Modal */}
      {showUnitsModal && selectedRequestForUnits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">
              {language === "ar" ? "اختر عدد الوحدات" : "Select Units to Donate"}
            </h2>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">
                {language === "ar" ? "الطلب: " : "Request: "}
                <span className="font-semibold text-slate-900">
                  {selectedRequestForUnits.fname} {selectedRequestForUnits.lname}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                {language === "ar" ? "الوحدات المتاحة: " : "Units Available: "}
                <span className="font-semibold text-slate-900">
                  {selectedRequestForUnits.maxAvailable}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {language === "ar" ? "الوحدات التي تريد التبرع بها" : "Units to Donate"}
              </label>
              <select
                value={unitsToAssign}
                onChange={(e) => setUnitsToAssign(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
              >
                {Array.from({ length: selectedRequestForUnits.maxAvailable }, (_, i) => i + 1).map(
                  (num) => (
                    <option key={num} value={num}>
                      {num} {language === "ar" ? "وحدة" : "unit(s)"}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleAssignSelf(selectedRequestForUnits._id, unitsToAssign);
                }}
                disabled={assigningId === selectedRequestForUnits._id}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {assigningId === selectedRequestForUnits._id ? (
                  <>
                    <Loader size={16} className="animate-spin inline mr-2" />
                    {language === "ar" ? "جاري..." : "Assigning..."}
                  </>
                ) : (
                  language === "ar" ? "تأكيد" : "Confirm"
                )}
              </button>
              <button
                onClick={() => {
                  setShowUnitsModal(false);
                  setSelectedRequestForUnits(null);
                  setUnitsToAssign(1);
                }}
                className="flex-1 bg-slate-300 text-slate-900 py-2 px-4 rounded-lg font-semibold hover:bg-slate-400 transition"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
