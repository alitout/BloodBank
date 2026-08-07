import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader, AlertCircle, Check, Droplet, MapPin, Users, Eye } from "lucide-react";

import { useLanguage } from "./LanguageContext.jsx";
import { useAuth } from "./AuthContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

export const DonorAvailableRequests = () => {
  const { t, language } = useLanguage();
  const { accessToken, user, refreshUserProfile } = useAuth();

  const navigate = useNavigate();

  const [availableRequests, setAvailableRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [assignedRequests, setAssignedRequests] = useState(() => new Set());

  const [assigningId, setAssigningId] = useState(null);

  const cooldownInformation = useMemo(() => {
    if (
      user?.status !== "cool-down" ||
      !user?.nextEligibleDate
    ) {
      return {
        isInCoolDown: false,
        nextEligibleDate: null,
        remainingDays: 0,
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
      };
    }

    return {
      isInCoolDown: true,
      nextEligibleDate,
      remainingDays: Math.max(
        1,
        Math.ceil(
          difference /
          MILLISECONDS_PER_DAY
        )
      ),
    };
  }, [
    user?.status,
    user?.nextEligibleDate,
  ]);

  const isInCoolDown =
    cooldownInformation.isInCoolDown;

  const formattedNextEligibleDate =
    useMemo(() => {
      const date =
        cooldownInformation.nextEligibleDate;

      if (!date) {
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
    }, [
      cooldownInformation.nextEligibleDate,
      language,
    ]);

  useEffect(() => {
    if (
      typeof refreshUserProfile ===
      "function"
    ) {
      refreshUserProfile();
    }
  }, [refreshUserProfile]);

  const fetchAvailableRequests =
    useCallback(async () => {
      const token =
        getAccessToken() ||
        accessToken;

      if (!token) {
        setAvailableRequests([]);
        setLoading(false);

        setError(
          language === "ar"
            ? "لم يتم العثور على رمز تسجيل الدخول. يرجى تسجيل الدخول مجدداً."
            : "No authentication token was found. Please log in again."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/requesters/available-requests`,
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
          const errorMessage =
            await getResponseError(
              response,
              language === "ar"
                ? "تعذر تحميل طلبات التبرع المتاحة."
                : "Failed to fetch available requests."
            );

          throw new Error(errorMessage);
        }

        const data =
          await response.json();

        const requests = Array.isArray(
          data?.availableRequests
        )
          ? data.availableRequests
          : Array.isArray(data)
            ? data
            : [];

        setAvailableRequests(requests);
      } catch (requestError) {
        console.error(
          "[DONOR AVAILABLE REQUESTS] Fetch error:",
          requestError
        );

        setAvailableRequests([]);

        setError(
          requestError?.message ||
          (language === "ar"
            ? "حدث خطأ أثناء تحميل الطلبات."
            : "An error occurred while loading requests.")
        );
      } finally {
        setLoading(false);
      }
    }, [
      accessToken,
      language,
    ]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    fetchAvailableRequests();
  }, [
    accessToken,
    fetchAvailableRequests,
  ]);

  const handleAssignSelf = async (
    requestId
  ) => {
    if (
      !requestId ||
      assigningId ||
      assignedRequests.has(requestId)
    ) {
      return;
    }

    if (isInCoolDown) {
      window.alert(
        language === "ar"
          ? "لا يمكنك التسجيل للتبرع خلال فترة الانتظار."
          : "You cannot assign yourself while your waiting period is active."
      );

      return;
    }

    const token =
      getAccessToken() ||
      accessToken;

    if (!token) {
      window.alert(
        language === "ar"
          ? "يرجى تسجيل الدخول مجدداً."
          : "Please log in again."
      );

      return;
    }

    try {
      setAssigningId(requestId);

      const response = await fetch(
        `${API_BASE_URL}/requesters/${requestId}/assign-self`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            unitsRequested: 1,
          }),
        }
      );

      if (!response.ok) {
        const errorMessage =
          await getResponseError(
            response,
            language === "ar"
              ? "تعذر التسجيل لهذا الطلب."
              : "Failed to assign yourself."
          );

        throw new Error(errorMessage);
      }

      setAssignedRequests(
        (previousRequests) => {
          const updatedRequests =
            new Set(previousRequests);

          updatedRequests.add(
            requestId
          );

          return updatedRequests;
        }
      );


      setAvailableRequests(
        (previousRequests) =>
          previousRequests.filter(
            (request) =>
              request._id !== requestId
          )
      );

      window.alert(
        t("donorAssignSuccess") ||
        (language === "ar"
          ? "تم التسجيل للطلب بنجاح."
          : "You have been assigned successfully.")
      );

      if (
        typeof refreshUserProfile ===
        "function"
      ) {
        await refreshUserProfile();
      }
    } catch (assignmentError) {
      console.error(
        "[DONOR AVAILABLE REQUESTS] Assignment error:",
        assignmentError
      );

      window.alert(
        `${t("error") ||
        (language === "ar"
          ? "خطأ"
          : "Error")
        }: ${assignmentError.message}`
      );
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader
          size={40}
          className="animate-spin text-red-500"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cool-down warning */}
      {isInCoolDown && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />

          <div>
            <p className="text-sm font-semibold text-orange-800">
              {language === "ar"
                ? "فترة الانتظار نشطة"
                : "Waiting Period Active"}
            </p>

            {cooldownInformation.remainingDays !==
              null && (
                <p className="mt-1 text-sm text-orange-700">
                  {language === "ar"
                    ? `الوقت المتبقي: ${cooldownInformation.remainingDays} يوم`
                    : `Time remaining: ${cooldownInformation.remainingDays} day${cooldownInformation.remainingDays !==
                      1
                      ? "s"
                      : ""
                    }`}
                </p>
              )}

            {formattedNextEligibleDate && (
              <p className="mt-1 text-sm text-orange-700">
                {language === "ar"
                  ? `يمكنك التبرع مجدداً ابتداءً من: ${formattedNextEligibleDate}`
                  : `You can donate again starting: ${formattedNextEligibleDate}`}
              </p>
            )}

            <p className="mt-1 text-xs text-orange-700">
              {language === "ar"
                ? "لن تتمكن من التسجيل للتبرع حتى انتهاء فترة الانتظار."
                : "You cannot assign yourself to a donation request until the waiting period ends."}
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle
            className="mt-0.5 flex-shrink-0 text-red-500"
            size={20}
          />

          <div className="flex-1">
            <p className="font-semibold text-red-800">
              {t("error") ||
                (language === "ar"
                  ? "خطأ"
                  : "Error")}
            </p>

            <p className="text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={
                fetchAvailableRequests
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

      {/* Header information */}
      <div className="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-4">
        <p className="font-semibold text-red-800">
          {t("availableRequestsCount", {
            count:
              availableRequests.length,
            bloodType:
              user?.bloodType || "",
          }) ||
            (language === "ar"
              ? `${availableRequests.length} طلب متاح يتطابق مع فئة دمك (${user?.bloodType || "—"})`
              : `${availableRequests.length} available request${availableRequests.length !==
                1
                ? "s"
                : ""
              } matching your blood type (${user?.bloodType || "—"})`)}
        </p>
      </div>

      {/* Empty state */}
      {!error &&
        availableRequests.length === 0 ? (
        <div className="rounded-lg bg-gray-50 py-20 text-center">
          <Heart
            size={60}
            className="mx-auto mb-4 text-gray-300"
          />

          <p className="text-lg text-gray-600">
            {t("noAvailableRequests") ||
              (language === "ar"
                ? "لا توجد طلبات متاحة حالياً"
                : "No available requests")}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            {isInCoolDown
              ? language === "ar"
                ? "لن تظهر لك طلبات قابلة للتسجيل خلال فترة الانتظار."
                : "You cannot join donation requests while your waiting period is active."
              : t(
                "notifyOnNewRequests"
              ) ||
              (language === "ar"
                ? "سنقوم بإشعارك عند توفر طلب جديد."
                : "You will be notified when new requests become available.")}
          </p>
        </div>
      ) : (
        availableRequests.length >
        0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {availableRequests.map(
              (request) => {
                const requestId =
                  request._id ||
                  request.id;

                const isAssigned =
                  assignedRequests.has(
                    requestId
                  );

                const isAssigning =
                  assigningId ===
                  requestId;

                const unitsAvailable =
                  request.unitsAvailable ??
                  request.unitsNeeded ??
                  0;

                return (
                  <div
                    key={requestId}
                    className={`overflow-hidden rounded-lg border-2 bg-white shadow-md transition hover:shadow-lg ${isAssigned
                      ? "border-green-500 bg-green-50"
                      : "border-red-200 hover:border-red-400"
                      }`}
                  >
                    {/* Card header */}
                    <div
                      className={`px-4 py-3 ${isAssigned
                        ? "border-b border-green-200 bg-green-100"
                        : "bg-gradient-to-r from-red-500 to-red-600 text-white"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold">
                          {request.fname}{" "}
                          {request.lname}
                        </h3>

                        {isAssigned && (
                          <Check
                            size={24}
                            className="text-green-600"
                          />
                        )}
                      </div>

                      {request.fatherName && (
                        <p
                          className={`text-sm ${isAssigned
                            ? "text-green-700"
                            : "text-red-100"
                            }`}
                        >
                          {
                            request.fatherName
                          }
                        </p>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="space-y-3 px-4 py-4">
                      <div className="flex items-center gap-3 rounded bg-gray-50 p-2">
                        <Droplet
                          className="text-red-600"
                          size={20}
                        />

                        <div>
                          <p className="text-xs text-gray-600">
                            {t(
                              "bloodType"
                            ) ||
                              (language ===
                                "ar"
                                ? "فئة الدم"
                                : "Blood Type")}
                          </p>

                          <p className="font-bold text-red-600">
                            {request.bloodType ||
                              "—"}

                            {request.bloodGenre
                              ? ` (${request.bloodGenre})`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded bg-gray-50 p-2">
                        <MapPin
                          className="text-blue-600"
                          size={20}
                        />

                        <div>
                          <p className="text-xs text-gray-600">
                            {t(
                              "hospitalName"
                            ) ||
                              (language ===
                                "ar"
                                ? "المستشفى"
                                : "Hospital")}
                          </p>

                          <p className="font-semibold text-gray-800">
                            {request.hospital ||
                              "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded bg-gray-50 p-2">
                        <Users
                          className="text-purple-600"
                          size={20}
                        />

                        <div>
                          <p className="text-xs text-gray-600">
                            {language ===
                              "ar"
                              ? "الوحدات المتاحة"
                              : "Available Units"}
                          </p>

                          <p className="font-bold text-purple-600">
                            {unitsAvailable}
                          </p>
                        </div>
                      </div>

                      {request.description && (
                        <div className="rounded border border-blue-100 bg-blue-50 p-2">
                          <p className="mb-1 text-xs text-gray-600">
                            {t(
                              "notes"
                            ) ||
                              (language ===
                                "ar"
                                ? "ملاحظات"
                                : "Notes")}
                          </p>

                          <p className="text-sm text-gray-700">
                            {
                              request.description
                            }
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="border-t border-gray-200 px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/request-detail/${requestId}`
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 active:scale-95"
                        >
                          <Eye size={16} />

                          {language === "ar"
                            ? "عرض"
                            : "View"}
                        </button>

                        {isInCoolDown ? (
                          <button
                            type="button"
                            disabled
                            title={
                              language ===
                                "ar"
                                ? "أنت في فترة انتظار"
                                : "You are in the waiting period"
                            }
                            className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-600"
                          >
                            <AlertCircle
                              size={16}
                            />

                            {language === "ar"
                              ? "في فترة انتظار"
                              : "Waiting Period"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleAssignSelf(
                                requestId
                              )
                            }
                            disabled={
                              isAssigned ||
                              isAssigning
                            }
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${isAssigned
                              ? "cursor-not-allowed bg-green-500"
                              : isAssigning
                                ? "cursor-wait bg-blue-500 opacity-70"
                                : "bg-red-500 hover:bg-red-600 active:scale-95"
                              }`}
                          >
                            {isAssigned ? (
                              <>
                                <Check
                                  size={
                                    16
                                  }
                                />

                                {t(
                                  "assigned"
                                ) ||
                                  (language ===
                                    "ar"
                                    ? "تم التسجيل"
                                    : "Assigned")}
                              </>
                            ) : isAssigning ? (
                              <>
                                <Loader
                                  size={
                                    16
                                  }
                                  className="animate-spin"
                                />

                                {t(
                                  "assigning"
                                ) ||
                                  (language ===
                                    "ar"
                                    ? "جارٍ التسجيل"
                                    : "Assigning")}
                              </>
                            ) : (
                              <>
                                <Heart
                                  size={
                                    16
                                  }
                                />

                                {t(
                                  "donateNow"
                                ) ||
                                  (language ===
                                    "ar"
                                    ? "تبرع الآن"
                                    : "Donate Now")}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
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