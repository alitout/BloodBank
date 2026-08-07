import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Calendar, MapPin, Droplet, AlertCircle, Trophy, Loader } from "lucide-react";

import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { useDataCache } from "./DataCacheContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";


const getResponseError = async (
  response,
  fallbackMessage
) => {
  try {
    const data = await response.json();

    return (
      data?.error ||
      data?.message ||
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
};

const formatDate = (
  value,
  language
) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date.toLocaleDateString(
    language === "ar"
      ? "ar-LB"
      : "en-GB",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
};

const normalizeDonation = (
  donation
) => {
  const request =
    donation?.requestId &&
      typeof donation.requestId ===
      "object"
      ? donation.requestId
      : donation;

  const assignment =
    donation?.myAssignment || {};

  const unitsCompleted =
    Number(
      donation?.unitsCompleted ??
      assignment?.unitsCompleted ??
      0
    ) || 0;

  const donationStatus =
    donation?.status ||
    request?.status ||
    "unknown";

  return {
    _id:
      donation?._id ||
      donation?.donationId ||
      `${request?._id || request?.id || "donation"}-${donation?.createdAt || Math.random()}`,

    donationId:
      donation?.donationId || null,

    patientFirstName:
      request?.fname ||
      donation?.fname ||
      "",

    patientFatherName:
      request?.fatherName ||
      donation?.fatherName ||
      "",

    patientLastName:
      request?.lname ||
      donation?.lname ||
      "",

    bloodType:
      request?.bloodType ||
      donation?.bloodType ||
      "—",

    bloodGenre:
      request?.bloodGenre ||
      donation?.bloodGenre ||
      "",

    hospital:
      request?.hospital ||
      donation?.hospital ||
      "—",

    description:
      request?.description ||
      donation?.description ||
      "",

    requestDate:
      request?.date ||
      donation?.date ||
      null,

    unitsAssigned:
      Number(
        donation?.unitsAssigned ??
        assignment?.unitsAssigned ??
        0
      ) || 0,

    unitsCompleted,

    donationStatus,

    requestStatus:
      request?.status ||
      donation?.requestStatus ||
      "unknown",

    completedAt:
      donation?.donationDate ||
      donation?.adminApprovedAt ||
      donation?.donorCompletedAt ||
      assignment?.completedAt ||
      donation?.updatedAt ||
      null,

    createdAt:
      donation?.createdAt ||
      null,

    rejectionReason:
      donation?.rejectionReason ||
      null,
  };
};

const isCountableDonation = (
  donation
) => {
  if (
    donation.donationStatus ===
    "approved"
  ) {
    return true;
  }

  if (
    donation.unitsCompleted > 0 &&
    ![
      "rejected",
      "cancelled",
      "pending_admin_approval",
      "pending_confirmation",
    ].includes(
      donation.donationStatus
    )
  ) {
    return true;
  }

  return false;
};

export const DonationHistory = () => {
  const {
    user,
    accessToken,
    refreshUserProfile,
  } = useAuth();

  const { language } =
    useLanguage();

  const {
    getCachedData,
  } = useDataCache();

  const [donations, setDonations] =
    useState([]);

  const [
    totalDonatedUnits,
    setTotalDonatedUnits,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const processHistoryResponse =
    useCallback((data) => {
      let rawHistory = [];
      let backendTotal = null;

      if (Array.isArray(data)) {
        rawHistory = data;
      } else if (
        data &&
        typeof data === "object"
      ) {
        if (
          Array.isArray(data.history)
        ) {
          rawHistory = data.history;
        } else if (
          Array.isArray(
            data.donations
          )
        ) {
          rawHistory =
            data.donations;
        }

        backendTotal =
          data.totalUnits ??
          data.donationCount ??
          data.count ??
          null;
      }

      const normalizedHistory =
        rawHistory.map(
          normalizeDonation
        );

      const calculatedTotal =
        normalizedHistory
          .filter(
            isCountableDonation
          )
          .reduce(
            (total, donation) =>
              total +
              donation.unitsCompleted,
            0
          );

      const parsedBackendTotal =
        Number(backendTotal);

      const finalTotal =
        backendTotal !== null &&
          Number.isFinite(
            parsedBackendTotal
          )
          ? parsedBackendTotal
          : calculatedTotal;

      setDonations(
        normalizedHistory
      );

      setTotalDonatedUnits(
        finalTotal
      );
    }, []);

  const fetchDonationHistory =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        /*
         * Support old array cache and new object cache.
         */
        const cachedHistory =
          getCachedData?.(
            user?.role,
            "donationHistory"
          );

        if (cachedHistory) {
          processHistoryResponse(
            cachedHistory
          );

          setLoading(false);
          return;
        }

        const token =
          getAccessToken() ||
          accessToken;

        if (!token) {
          throw new Error(
            language === "ar"
              ? "لم يتم العثور على رمز تسجيل الدخول. يرجى تسجيل الدخول مجدداً."
              : "No authentication token was found. Please log in again."
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/requesters/donation-history`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          if (
            response.status === 404
          ) {
            processHistoryResponse({
              history: [],
              count: 0,
            });

            return;
          }

          const errorMessage =
            await getResponseError(
              response,
              language === "ar"
                ? "تعذر تحميل سجل التبرعات."
                : "Failed to fetch donation history."
            );

          throw new Error(errorMessage);
        }

        const data =
          await response.json();

        processHistoryResponse(data);

        if (
          typeof refreshUserProfile ===
          "function"
        ) {
          await refreshUserProfile();
        }
      } catch (historyError) {
        console.error(
          "[DONATION HISTORY] Fetch error:",
          historyError
        );

        setError(
          historyError?.message ||
          (language === "ar"
            ? "حدث خطأ أثناء تحميل سجل التبرعات."
            : "An error occurred while loading donation history.")
        );

        setDonations([]);
        setTotalDonatedUnits(0);
      } finally {
        setLoading(false);
      }
    }, [
      accessToken,
      getCachedData,
      language,
      processHistoryResponse,
      refreshUserProfile,
      user?.role,
    ]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    fetchDonationHistory();
  }, [
    accessToken,
    fetchDonationHistory,
  ]);

  const lastDonationDate =
    useMemo(() => {
      if (user?.lastDonationDate) {
        return formatDate(
          user.lastDonationDate,
          language
        );
      }

      const completedDonations =
        donations
          .filter(
            isCountableDonation
          )
          .filter(
            (donation) =>
              donation.completedAt
          )
          .sort(
            (first, second) =>
              new Date(
                second.completedAt
              ).getTime() -
              new Date(
                first.completedAt
              ).getTime()
          );

      return formatDate(
        completedDonations[0]
          ?.completedAt,
        language
      );
    }, [
      donations,
      language,
      user?.lastDonationDate,
    ]);

  const nextEligibleDate =
    useMemo(
      () =>
        formatDate(
          user?.nextEligibleDate,
          language
        ),
      [
        language,
        user?.nextEligibleDate,
      ]
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-green-600" />

        <span className="ms-3 text-slate-600">
          {language === "ar"
            ? "جاري التحميل..."
            : "Loading..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
        <div className="flex items-start gap-4">
          <Trophy className="h-12 w-12 flex-shrink-0 text-green-600" />

          <div className="space-y-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {totalDonatedUnits}
              </h2>

              <p className="text-green-700">
                {language === "ar"
                  ? "إجمالي الوحدات المتبرع بها"
                  : "Total Units Donated"}
              </p>
            </div>

            <div className="space-y-1 text-sm text-slate-600">
              {lastDonationDate && (
                <p>
                  {language === "ar"
                    ? "آخر تبرع: "
                    : "Last donation: "}

                  <span className="font-semibold text-slate-800">
                    {
                      lastDonationDate
                    }
                  </span>
                </p>
              )}

              {user?.status ===
                "cool-down" &&
                nextEligibleDate && (
                  <p>
                    {language === "ar"
                      ? "موعد التبرع التالي: "
                      : "Next eligible date: "}

                    <span className="font-semibold text-orange-700">
                      {
                        nextEligibleDate
                      }
                    </span>
                  </p>
                )}

              {user?.status && (
                <p>
                  {language === "ar"
                    ? "حالة المتبرع: "
                    : "Donor status: "}

                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${user.status ===
                      "eligible"
                      ? "bg-green-100 text-green-800"
                      : user.status ===
                        "cool-down"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {user.status}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

          <div className="flex-1">
            <p className="text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={
                fetchDonationHistory
              }
              className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              {language === "ar"
                ? "إعادة المحاولة"
                : "Try Again"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!error &&
        donations.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 text-slate-400" />

          <p className="font-medium text-slate-600">
            {language === "ar"
              ? "لا توجد تبرعات سابقة"
              : "No previous donations"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {language === "ar"
              ? "ستظهر تبرعاتك السابقة هنا بعد تسجيلها واعتمادها."
              : "Your previous donations will appear here after they are recorded and approved."}
          </p>
        </div>
      ) : (
        donations.length > 0 && (
          <div className="grid gap-4">
            {donations.map(
              (donation) => {
                const patientName = [
                  donation.patientFirstName,
                  donation.patientFatherName,
                  donation.patientLastName,
                ]
                  .filter(Boolean)
                  .join(" ");

                const completedDate =
                  formatDate(
                    donation.completedAt,
                    language
                  );

                const requestDate =
                  formatDate(
                    donation.requestDate,
                    language
                  );

                const isApproved =
                  donation.donationStatus ===
                  "approved";

                const isPending =
                  [
                    "pending_confirmation",
                    "pending_admin_approval",
                    "pending",
                  ].includes(
                    donation.donationStatus
                  );

                const statusClasses =
                  isApproved
                    ? "bg-green-100 text-green-800"
                    : isPending
                      ? "bg-yellow-100 text-yellow-800"
                      : donation.donationStatus ===
                        "rejected" ||
                        donation.donationStatus ===
                        "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800";

                return (
                  <div
                    key={
                      donation._id
                    }
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {patientName ||
                              (language ===
                                "ar"
                                ? "متلقي التبرع"
                                : "Donation Recipient")}
                          </h3>

                          {donation.donationId && (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                donation.donationId
                              }
                            </p>
                          )}
                        </div>

                        <div className="rounded-full bg-red-100 px-3 py-1 text-lg font-bold text-red-800">
                          {
                            donation.bloodType
                          }
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-3">
                        <Droplet className="h-5 w-5 flex-shrink-0 text-red-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "نوع الدم"
                              : "Blood Type"}
                          </p>

                          <p className="font-semibold capitalize text-slate-900">
                            {donation.bloodGenre
                              ? `${donation.bloodType} (${donation.bloodGenre.replace(
                                "_",
                                " "
                              )})`
                              : donation.bloodType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Heart className="h-5 w-5 flex-shrink-0 text-green-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "الوحدات المتبرع بها"
                              : "Units Donated"}
                          </p>

                          <p className="font-semibold text-slate-900">
                            {
                              donation.unitsCompleted
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 flex-shrink-0 text-blue-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "المستشفى"
                              : "Hospital"}
                          </p>

                          <p className="font-semibold text-slate-900">
                            {
                              donation.hospital
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 flex-shrink-0 text-purple-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "التاريخ المطلوب"
                              : "Date Needed"}
                          </p>

                          <p className="font-semibold text-slate-900">
                            {requestDate ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "حالة التبرع"
                              : "Donation Status"}
                          </p>

                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold ${statusClasses}`}
                          >
                            {donation.donationStatus
                              ?.replaceAll(
                                "_",
                                " "
                              )
                              .toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 flex-shrink-0 text-green-600" />

                        <div>
                          <p className="text-xs text-slate-600">
                            {language ===
                              "ar"
                              ? "تاريخ الإكمال"
                              : "Completed On"}
                          </p>

                          <p className="font-semibold text-slate-900">
                            {completedDate ||
                              "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {donation.description && (
                      <div className="border-t border-slate-200 bg-white px-4 py-3">
                        <p className="mb-1 text-xs text-slate-600">
                          {language ===
                            "ar"
                            ? "الملاحظات"
                            : "Notes"}
                        </p>

                        <p className="text-slate-700">
                          {
                            donation.description
                          }
                        </p>
                      </div>
                    )}

                    {donation.rejectionReason && (
                      <div className="border-t border-red-200 bg-red-50 px-4 py-3">
                        <p className="mb-1 text-xs font-semibold text-red-700">
                          {language ===
                            "ar"
                            ? "سبب الرفض"
                            : "Rejection Reason"}
                        </p>

                        <p className="text-sm text-red-700">
                          {
                            donation.rejectionReason
                          }
                        </p>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )
      )}
    </div>
  );
};