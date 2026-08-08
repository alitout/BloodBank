import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { useLanguage } from "../components/LanguageContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Heart, ArrowLeft, Loader, AlertCircle, MapPin, Droplet, Users, Check } from "lucide-react";

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export const RequestDetailPage =
  () => {
    const { requestId } =
      useParams();

    const navigate =
      useNavigate();

    const { t, language } =
      useLanguage();

    const {
      user,
      accessToken,
      refreshUserProfile,
    } = useAuth();

    const [
      request,
      setRequest,
    ] = useState(null);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [error, setError] =
      useState(null);

    const [
      assigning,
      setAssigning,
    ] = useState(false);

    const [
      assigned,
      setAssigned,
    ] = useState(false);

    const [
      showUnitsModal,
      setShowUnitsModal,
    ] = useState(false);

    const [
      unitsToAssign,
      setUnitsToAssign,
    ] = useState(1);

    /*
     * Refresh current user when page opens.
     */
    useEffect(() => {
      if (
        typeof refreshUserProfile !==
        "function"
      ) {
        return;
      }

      refreshUserProfile();
    }, [refreshUserProfile]);

    /*
     * Fetch request details.
     */
    useEffect(() => {
      const fetchRequest =
        async () => {
          try {
            setLoading(true);
            setError(null);

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
                `${API_BASE_URL}/requesters/${requestId}`,
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
                "Failed to fetch request details"
              );
            }

            setRequest(data);
          } catch (
          requestError
          ) {
            console.error(
              "[REQUEST DETAIL] Fetch error:",
              requestError
            );

            setError(
              requestError.message
            );
          } finally {
            setLoading(false);
          }
        };

      if (
        requestId &&
        accessToken
      ) {
        fetchRequest();
      }
    }, [
      requestId,
      accessToken,
    ]);

    const totalAssigned =
      request?.assignedDonors
        ?.reduce(
          (
            total,
            donor
          ) =>
            total +
            Number(
              donor.unitsAssigned ||
              0
            ),
          0
        ) || 0;

    const unitsRemaining =
      request
        ? Math.max(
          0,
          Number(
            request.unitsNeeded ||
            0
          ) -
          totalAssigned
        )
        : 0;

    /*
     * Cooldown information.
     */
    const nextEligibleDate =
      user?.nextEligibleDate
        ? new Date(
          user.nextEligibleDate
        )
        : null;

    const validNextEligibleDate =
      Boolean(
        nextEligibleDate &&
        !Number.isNaN(
          nextEligibleDate.getTime()
        )
      );

    const isUserInCoolDown =
      user?.status ===
      "cool-down" &&
      validNextEligibleDate &&
      nextEligibleDate.getTime() >
      Date.now();

    const isUnverifiedDonor =
      user?.role === "donor" &&
      user?.verifiedByAdmin !== true;

    const remainingDays =
      isUserInCoolDown
        ? Math.max(
          1,
          Math.ceil(
            (
              nextEligibleDate.getTime() -
              Date.now()
            ) /
            MILLISECONDS_PER_DAY
          )
        )
        : 0;

    const formattedNextEligibleDate =
      isUserInCoolDown
        ? nextEligibleDate.toLocaleDateString(
          language === "ar"
            ? "ar-LB"
            : "en-GB",
          {
            year:
              "numeric",
            month:
              "long",
            day:
              "numeric",
          }
        )
        : null;

    const handleAssignSelf =
      async () => {
        if (isUnverifiedDonor) {
          window.alert(
            language === "ar"
              ? "يجب أن يوافق المسؤول على حسابك قبل أن تتمكن من التبرع."
              : "Your account must be verified by an administrator before you can donate."
          );

          return;
        }
        if (
          isUserInCoolDown
        ) {
          window.alert(
            language === "ar"
              ? "لا يمكنك التبرع خلال فترة الانتظار."
              : "You cannot donate while your waiting period is active."
          );

          return;
        }

        if (
          !unitsToAssign ||
          unitsToAssign <= 0
        ) {
          window.alert(
            t("invalidUnits") ||
            "Please select valid units"
          );

          return;
        }

        if (
          unitsToAssign >
          unitsRemaining
        ) {
          window.alert(
            language === "ar"
              ? "عدد الوحدات المحدد أكبر من العدد المتاح."
              : "The selected number of units exceeds the available units."
          );

          return;
        }

        try {
          setAssigning(true);

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
              `${API_BASE_URL}/requesters/${requestId}/assign-self`,
              {
                method: "POST",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body:
                  JSON.stringify({
                    unitsRequested:
                      unitsToAssign,
                  }),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
              "Failed to assign yourself"
            );
          }

          setAssigned(true);

          setShowUnitsModal(
            false
          );

          window.alert(
            t(
              "donorAssignSuccess"
            ) ||
            "Successfully assigned to request!"
          );

          /*
           * Get current profile again in case
           * backend changed donor information.
           */
          if (
            typeof refreshUserProfile ===
            "function"
          ) {
            await refreshUserProfile();
          }

          window.setTimeout(
            () => {
              navigate(
                "/donor-portal"
              );
            },
            1000
          );
        } catch (
        assignmentError
        ) {
          console.error(
            "[REQUEST DETAIL] Assignment error:",
            assignmentError
          );

          window.alert(
            `${t("error") || "Error"}: ${assignmentError.message}`
          );
        } finally {
          setAssigning(false);
        }
      };

    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader
            size={40}
            className="animate-spin text-red-500"
          />
        </div>
      );
    }

    if (
      error ||
      !request
    ) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft
                size={20}
              />

              {language === "ar"
                ? "العودة"
                : "Back"}
            </button>

            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
              <AlertCircle
                className="flex-shrink-0 text-red-500"
                size={24}
              />

              <div>
                <p className="font-semibold text-red-800">
                  {t(
                    "error"
                  ) ||
                    "Error"}
                </p>

                <p className="text-red-700">
                  {error ||
                    "Request not found"}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mb-6 flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft
              size={20}
            />

            {language === "ar"
              ? "العودة"
              : "Back"}
          </button>

          {/* Cooldown */}
          {isUserInCoolDown && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />

              <div>
                <p className="font-semibold text-orange-800">
                  {language === "ar"
                    ? "فترة انتظار نشطة"
                    : "Waiting Period Active"}
                </p>

                <p className="mt-1 text-sm text-orange-700">
                  {language === "ar"
                    ? `الوقت المتبقي: ${remainingDays} يوم`
                    : `${remainingDays} day${remainingDays ===
                      1
                      ? ""
                      : "s"
                    } remaining`}
                </p>

                {formattedNextEligibleDate && (
                  <p className="mt-1 text-sm text-orange-700">
                    {language ===
                      "ar"
                      ? `يمكنك التبرع مجدداً ابتداءً من: ${formattedNextEligibleDate}`
                      : `You can donate again starting: ${formattedNextEligibleDate}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">
                  {
                    request.fname
                  }{" "}
                  {
                    request.fatherName
                  }{" "}
                  {
                    request.lname
                  }
                </h1>
              </div>

              <Heart
                size={40}
                className="flex-shrink-0 text-red-200"
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex flex-col items-center gap-3 text-center">
                <Droplet
                  className="text-red-600"
                  size={24}
                />

                <div>
                  <p className="text-sm text-gray-600">
                    {t(
                      "bloodType"
                    )}
                  </p>

                  <p className="text-lg font-bold text-red-600">
                    {
                      request.bloodType
                    }

                    {request.bloodGenre
                      ? ` (${request.bloodGenre})`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <div className="flex flex-col items-center gap-3 text-center">
                <Users
                  className="text-blue-600"
                  size={24}
                />

                <div>
                  <p className="text-sm text-gray-600">
                    {t(
                      "unitsNeeded"
                    )}
                  </p>

                  <p className="text-lg font-bold text-blue-600">
                    {
                      request.unitsNeeded
                    }
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {language ===
                      "ar"
                      ? `${unitsRemaining} وحدة متبقية`
                      : `${unitsRemaining} units remaining`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow md:col-span-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <MapPin
                  className="text-green-600"
                  size={24}
                />

                <div>
                  <p className="text-sm text-gray-600">
                    {t(
                      "hospitalName"
                    )}
                  </p>

                  <p className="font-bold text-gray-800">
                    {
                      request.hospital
                    }
                  </p>

                  {request.location && (
                    <p className="mt-1 text-sm text-gray-600">
                      {
                        request.location
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="items-center rounded-lg bg-white p-4 text-center shadow">
              <h3 className="mb-3 font-bold text-gray-900">
                {language === "ar"
                  ? "حالة الطلب"
                  : "Request Status"}
              </h3>

              <span
                className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${request.status ===
                  "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : request.status ===
                    "fulfilled"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                  }`}
              >
                {
                  request.status
                }
              </span>
            </div>

            <div className="items-center rounded-lg bg-white p-4 text-center shadow">
              <h3 className="mb-3 font-bold text-gray-900">
                {language === "ar"
                  ? "تاريخ الطلب"
                  : "Request Date"}
              </h3>

              <p className="text-gray-700">
                {request.createdAt
                  ? new Date(
                    request.createdAt
                  ).toLocaleDateString(
                    language ===
                      "ar"
                      ? "ar-LB"
                      : "en-GB"
                  )
                  : "—"}
              </p>
            </div>
          </div>

          {request.assignedDonors
            ?.length > 0 && (
              <div className="mb-6 rounded-lg bg-white p-4 shadow">
                <h3 className="mb-3 text-center font-bold text-gray-900">
                  {language === "ar"
                    ? "المتبرعون المعينون"
                    : "Assigned Donors"}{" "}
                  (
                  {
                    request
                      .assignedDonors
                      .length
                  }
                  )
                </h3>

                <div className="space-y-2">
                  {request.assignedDonors.map(
                    (
                      donor,
                      index
                    ) => (
                      <div
                        key={
                          donor.donorUid ||
                          index
                        }
                        className="flex items-center justify-center rounded bg-green-50 p-2"
                      >
                        <span className="text-sm text-gray-700">
                          {donor.donorName ||
                            (language ===
                              "ar"
                              ? "متبرع"
                              : "Donor")}{" "}
                          -{" "}
                          {
                            donor.unitsAssigned
                          }{" "}
                          {language ===
                            "ar"
                            ? "وحدة"
                            : "units"}
                        </span>

                        <Check
                          size={18}
                          className="ml-2 flex-shrink-0 text-green-600"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {request.description && (
            <div className="mb-6 rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 text-center font-bold text-gray-900">
                {language === "ar"
                  ? "ملاحظات"
                  : "Notes"}
              </h3>

              <p className="text-center text-gray-700">
                {
                  request.description
                }
              </p>
            </div>
          )}

          {isUnverifiedDonor && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-800">
              {language === "ar"
                ? "حسابك بانتظار موافقة المسؤول. لا يمكنك التبرع حالياً."
                : "Your account is awaiting administrator verification. Donation is currently disabled."}
            </div>
          )}
          
          <div className="mb-6 flex justify-center gap-4">
            <button
              title={
                isUnverifiedDonor
                  ? language === "ar"
                    ? "الحساب بانتظار موافقة المسؤول"
                    : "Account pending administrator verification"
                  : undefined
              }
              type="button"
              onClick={() =>
                setShowUnitsModal(
                  true
                )
              }
              disabled={
                assigned ||
                isUnverifiedDonor ||
                isUserInCoolDown ||
                unitsRemaining <= 0
              }
              className={`flex items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold transition ${assigned
                ? "cursor-not-allowed bg-green-500 text-white"
                : isUnverifiedDonor ||
                  isUserInCoolDown ||
                  unitsRemaining <= 0
                  ? "cursor-not-allowed bg-gray-300 text-gray-600"
                  : "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                }`}
            >
              {assigned ? (
                <>
                  <Check
                    size={20}
                  />

                  {language ===
                    "ar"
                    ? "تم التعيين"
                    : "Assigned"}
                </>
              ) : (
                <>
                  <Heart
                    size={20}
                  />

                  {language ===
                    "ar"
                    ? "تبرع الآن"
                    : "Donate Now"}
                </>
              )}
            </button>
          </div>
        </div>

        {showUnitsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-center text-xl font-bold text-gray-900">
                {language === "ar"
                  ? "اختر عدد الوحدات"
                  : "Select Units"}
              </h3>

              <p className="mb-4 text-center text-sm text-gray-600">
                {language === "ar"
                  ? `الحد الأقصى المتاح: ${unitsRemaining} وحدة`
                  : `Maximum available: ${unitsRemaining} units`}
              </p>

              <input
                type="number"
                min="1"
                max={
                  unitsRemaining
                }
                value={
                  unitsToAssign
                }
                onChange={(
                  event
                ) =>
                  setUnitsToAssign(
                    Math.min(
                      unitsRemaining,
                      Math.max(
                        1,
                        parseInt(
                          event.target
                            .value,
                          10
                        ) || 1
                      )
                    )
                  )
                }
                className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-red-600 focus:outline-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowUnitsModal(
                      false
                    )
                  }
                  disabled={
                    assigning
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {language === "ar"
                    ? "إلغاء"
                    : "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={
                    handleAssignSelf
                  }
                  disabled={
                    assigning ||
                    isUnverifiedDonor ||
                    isUserInCoolDown
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {assigning ? (
                    <>
                      <Loader
                        size={16}
                        className="animate-spin"
                      />

                      {language ===
                        "ar"
                        ? "جاري..."
                        : "Assigning..."}
                    </>
                  ) : language ===
                    "ar" ? (
                    "تبرع"
                  ) : (
                    "Donate"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
