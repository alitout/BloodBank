import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext.jsx";
import { useLanguage } from "../components/LanguageContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";
import { Heart, ArrowLeft, Loader, AlertCircle, MapPin, Droplet, Users, Check, Phone } from "lucide-react";
import { getConnectionBlockReason, getWaitingPeriodInformation } from "../utils/connectionAssessment.js";
import { formatDateDDMMYYYY, } from "../utils/dateFormat.js";
import { SignOutButton, } from "../components/SignOutButton.jsx";
import { Truck01, } from "@untitledui/icons";

export const RequestDetailPage =
  () => {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { user, accessToken, refreshUserProfile, } = useAuth();
    const [request, setRequest,] = useState(null);
    const [loading, setLoading,] = useState(true);
    const [error, setError] = useState(null);
    const [assigning, setAssigning,] = useState(false);
    const [assigned, setAssigned,] = useState(false);
    const [showUnitsModal, setShowUnitsModal,] = useState(false);
    const [unitsToAssign, setUnitsToAssign,] = useState(1);

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

    useEffect(() => {
      if (
        showUnitsModal &&
        !canDonate
      ) {
        setShowUnitsModal(false);
      }
    }, [
      showUnitsModal,
      canDonate,
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

    const connectionAssessment =
      request?.connectionAssessment;

    const assessmentAllowsDonation =
      connectionAssessment
        ?.platformEligible === true;

    const connectionBlockReason =
      getConnectionBlockReason(
        connectionAssessment,
        t
      );

    const waitingPeriod =
      getWaitingPeriodInformation(
        connectionAssessment
      );

    const alreadyAssigned =
      request?.assignedDonors?.some(
        (donor) =>
          donor.donorUid === user?.uid
      ) || false;

    const isAssigned =
      assigned || alreadyAssigned;

    const requestIsActive =
      request?.status === "pending";

    const hasAvailableUnits =
      unitsRemaining > 0;

    const canDonate =
      assessmentAllowsDonation &&
      requestIsActive &&
      hasAvailableUnits &&
      !isAssigned;

    const donationUnavailableReason =
      isAssigned
        ? t("alreadyAssignedToRequest")
        : !requestIsActive
          ? t("requestNoLongerActive")
          : !hasAvailableUnits
            ? t("noUnitsRemaining")
            : connectionBlockReason;

    const showWaitingPeriod =
      waitingPeriod.active &&
      requestIsActive &&
      hasAvailableUnits &&
      !isAssigned;

    const handleAssignSelf = async () => {
      if (!canDonate) {
        window.alert(
          donationUnavailableReason
        );

        return;
      }

      if (
        !unitsToAssign ||
        unitsToAssign <= 0
      ) {
        window.alert(
          t("invalidUnits")
        );

        return;
      }

      if (
        unitsToAssign >
        unitsRemaining
      ) {
        window.alert(t("selectedUnitsExceedAvailable"));

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
          const serverReason =
            Array.isArray(data?.reasons) &&
              data.reasons.length > 0
              ? data.reasons[0]
              : data?.code;

          throw new Error(
            data?.error ||
            serverReason ||
            t("failedToAssignRequest")
          );
        }

        setAssigned(true);
        setShowUnitsModal(false);
        window.alert(t("donorAssignSuccess"));
        if (typeof refreshUserProfile === "function") {
          await refreshUserProfile();
        }
        window.dispatchEvent(
          new CustomEvent(
            "donor-assignment-updated"
          )
        );
        navigate("/dashboard?tab=assigned", { replace: true, });
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
            <div className="mb-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard?tab=requests",
                    {
                      replace: true,
                    }
                  )
                }
                className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft size={20} />

                {t("back")}
              </button>

              <SignOutButton />
            </div>

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
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard?tab=requests",
                  {
                    replace: true,
                  }
                )
              }
              className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={20} />

              {t("back")}
            </button>

            <SignOutButton />
          </div>

          {/* Cooldown */}
          {showWaitingPeriod && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

              <div>
                <p className="font-semibold text-orange-800">
                  {t("waitingPeriodActive")}
                </p>

                <p className="mt-1 text-sm text-orange-700">
                  {t("timeRemaining")}:{" "}
                  {waitingPeriod.remainingDays}{" "}
                  {waitingPeriod.remainingDays === 1
                    ? t("day")
                    : t("days")}
                </p>

                <p className="mt-1 text-sm text-orange-700">
                  {t("canDonateAgainStarting")}:{" "}
                  {
                    waitingPeriod
                      .formattedNextEligibleDate
                  }
                </p>

                <p className="mt-1 text-xs text-orange-700">
                  {t(
                    "cannotDonateDuringWaitingPeriod"
                  )}
                </p>
              </div>
            </div>
          )}

          {!canDonate &&
            !isAssigned &&
            !showWaitingPeriod && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <p className="font-semibold text-amber-900">
                    {t(
                      "donationCurrentlyUnavailable"
                    )}
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    {donationUnavailableReason}
                  </p>
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

            <div className="rounded-lg bg-white p-4 shadow md:col-span-2">
              <h3 className="mb-3 text-center font-bold text-gray-900">
                {t(
                  "requesterContactInformation"
                )}
              </h3>

              <div className="flex flex-col items-center gap-3">
                <a
                  href={
                    request
                      .requesterContact
                      ?.phone
                      ? `tel:${request.requesterContact.phone}`
                      : undefined
                  }
                  className="flex items-center gap-2 text-gray-700 hover:text-red-600"
                >
                  <Phone className="h-5 w-5" />

                  {request
                    .requesterContact
                    ?.phone ||
                    t("notProvided")}
                </a>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow md:col-span-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <Truck01
                  className={`h-6 w-6 ${request
                    .transportationAvailable ===
                    true
                    ? "text-red-600"
                    : "text-slate-500"
                    }`}
                  aria-hidden="true"
                />

                <div>
                  <p className="text-sm text-gray-600">
                    {t(
                      "transportationAvailability"
                    )}
                  </p>

                  <p
                    className={`font-bold ${request
                      .transportationAvailable ===
                      true
                      ? "text-red-700"
                      : "text-slate-700"
                      }`}
                  >
                    {request
                      .transportationAvailable ===
                      true
                      ? t(
                        "transportationAvailable"
                      )
                      : t(
                        "transportationNotAvailable"
                      )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {request
                      .transportationAvailable ===
                      true
                      ? t(
                        "transportationAvailableDetail"
                      )
                      : t(
                        "transportationNotAvailableDetail"
                      )}
                  </p>
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
                  ? formatDateDDMMYYYY(
                    request.createdAt
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

          <div className="mb-6 flex justify-center gap-4">
            <button
              type="button"
              title={
                canDonate
                  ? t("donateNow")
                  : donationUnavailableReason
              }
              onClick={() => {
                if (canDonate) {
                  setShowUnitsModal(true);
                }
              }}
              disabled={!canDonate}
              className={`flex items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold transition ${isAssigned
                ? "cursor-not-allowed bg-green-500 text-white"
                : canDonate
                  ? "bg-red-500 text-white hover:bg-red-600 active:scale-95"
                  : "cursor-not-allowed bg-gray-300 text-gray-600"
                }`}
            >
              {isAssigned ? (
                <>
                  <Check size={20} />
                  {t("assigned")}
                </>
              ) : (
                <>
                  {canDonate ? (
                    <Heart size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}

                  {t("donateNow")}
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
                    !canDonate
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
