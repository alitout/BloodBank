import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Heart, Calendar, MapPin, Droplet, AlertCircle, Trophy } from "lucide-react";

export const DonationHistory = () => {
  const { user, accessToken } = useAuth();
  const { language } = useLanguage();
  const { getCachedData } = useDataCache();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    fetchDonationHistory();
  }, [accessToken]);

  const fetchDonationHistory = async () => {
    try {
      // Check cache first
      const cachedHistory = getCachedData(user?.role, 'donationHistory');
      if (cachedHistory) {
        setDonations(Array.isArray(cachedHistory) ? cachedHistory : []);
        setLoading(false);
        return;
      }

      // Fallback to fetch if cache empty
      setLoading(true);
      setError("");
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}/requesters/donation-history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "No donation history found"
            : "Failed to fetch donation history"
        );
      }

      const data = await response.json();
      setDonations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setDonations([]);
    } finally {
      setLoading(false);
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
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center gap-4">
          <Trophy className="w-12 h-12 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {user?.donationCount || 0}
            </h2>
            <p className="text-green-700">
              {language === "ar" ? "إجمالي الوحدات المتبرع بها" : "Total Units Donated"}
            </p>
            {user?.lastDonationDate && (
              <p className="text-sm text-slate-600 mt-1">
                {language === "ar" ? "آخر تبرع: " : "Last donation: "}
                <span className="font-semibold">
                  {new Date(user.lastDonationDate).toLocaleDateString(
                    language === "ar" ? "ar-SA" : "en-US"
                  )}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {donations.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-12 text-center border border-slate-200">
          <Heart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {language === "ar"
              ? "لا توجد تبرعات سابقة"
              : "No previous donations"}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            {language === "ar"
              ? "ستظهر تبرعاتك السابقة هنا"
              : "Your past donations will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {donations.map((donation) => (
            <div
              key={donation._id}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {donation.fname} {donation.lname}
                    </h3>
                    
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-lg">
                      {donation.bloodType}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50">
                {/* Blood Type */}
                <div className="flex items-center gap-3">
                  <Droplet className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "نوع الدم" : "Blood Type"}
                    </p>
                    <p className="font-semibold text-slate-900 capitalize">
                      {donation.bloodGenre?.replace("_", " ")}
                    </p>
                  </div>
                </div>

                {/* Units Donated */}
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "الوحدات المتبرع بها" : "Units Donated"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {donation.myAssignment?.unitsCompleted || 0}
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
                      {donation.hospital}
                    </p>
                  </div>
                </div>

                {/* Date Needed */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "التاريخ المطلوب" : "Date Needed"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {donation.date}
                    </p>
                  </div>
                </div>

                {/* Request Status */}
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "حالة الطلب" : "Request Status"}
                    </p>
                    <div
                      className={`text-sm font-bold py-1 px-2 rounded-full inline-block mt-1 ${
                        donation.status === "fulfilled"
                          ? "bg-green-100 text-green-800"
                          : donation.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {donation.status?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Completion Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-slate-600">
                      {language === "ar" ? "تاريخ الإكمال" : "Completed On"}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {donation.updatedAt
                        ? new Date(donation.updatedAt).toLocaleDateString(
                            language === "ar" ? "ar-SA" : "en-US"
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {donation.description && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white">
                  <p className="text-xs text-slate-600 mb-1">
                    {language === "ar" ? "الملاحظات" : "Notes"}
                  </p>
                  <p className="text-slate-700">{donation.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
