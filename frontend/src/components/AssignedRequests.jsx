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

  const handleCompleteDonation = async (request) => {
    const requestId = request?._id;

    if (!requestId) {
      setError(
        language === "ar"
          ? "معرّف الطلب غير موجود."
          : "Request ID is missing."
      );
      return;
    }

    const confirmationMessage =
      request.confirmationStatus === "rejected"
        ? language === "ar"
          ? "تم رفض التأكيد السابق. هل تريد إرسال تأكيد جديد للإدارة؟"
          : "The previous confirmation was rejected. Submit a new confirmation?"
        : language === "ar"
          ? "هل تؤكد أنك أتممت التبرع؟ سيتم إرسال التأكيد إلى الإدارة للموافقة."
          : "Do you confirm that you completed the donation? It will be sent to an administrator for approval.";

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setProcessingId(requestId);
      setError("");
      setSuccess("");

      const token = getAccessToken();

      if (!token) {
        throw new Error(
          language === "ar"
            ? "انتهت جلسة الدخول. يرجى تسجيل الدخول مجدداً."
            : "Authentication session is missing. Please log in again."
        );
      }

      let donation =
        request.donation || null;

      if (
        !donation ||
        request.confirmationStatus ===
        "not_confirmed" ||
        request.confirmationStatus ===
        "rejected"
      ) {
        const createResponse =
          await fetch(
            `${API_BASE_URL}/donations/request/${requestId}`,
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
            }
          );

        const createData =
          await createResponse.json();

        if (!createResponse.ok) {
          if (
            createResponse.status ===
            409 &&
            createData?.donation
          ) {
            donation =
              createData.donation;
          } else {
            throw new Error(
              createData?.error ||
              (language === "ar"
                ? "تعذر إنشاء سجل التبرع."
                : "Failed to create the donation record.")
            );
          }
        } else {
          donation =
            createData?.donation;
        }
      }

      if (!donation?.donationId) {
        throw new Error(
          language === "ar"
            ? "لم يُرجع الخادم معرّف التبرع."
            : "The server did not return a donation ID."
        );
      }

      /*
       * Do not submit again when already pending.
       */
      if (
        donation.status ===
        "pending_admin_approval"
      ) {
        setSuccess(
          language === "ar"
            ? "تم إرسال تأكيد التبرع مسبقاً، وهو بانتظار موافقة الإدارة."
            : "This donation was already submitted and is waiting for administrator approval."
        );

        setRequests((currentRequests) =>
          currentRequests.map(
            (currentRequest) =>
              currentRequest._id ===
                requestId
                ? {
                  ...currentRequest,
                  donation,
                  confirmationStatus:
                    "pending_admin_approval",
                  canConfirm: false,
                  waitingForAdmin: true,
                  rejected: false,
                  rejectionReason: null,
                }
                : currentRequest
          )
        );

        return;
      }

      /*
       * Submit for admin approval only when not already pending.
       */
      const confirmResponse =
        await fetch(
          `${API_BASE_URL}/donations/${donation.donationId}/complete`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
          }
        );

      const confirmData =
        await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(
          confirmData?.error ||
          (language === "ar"
            ? "تعذر إرسال تأكيد التبرع."
            : "Failed to submit the donation confirmation.")
        );
      }

      setSuccess(
        language === "ar"
          ? "تم إرسال تأكيد التبرع إلى الإدارة. الطلب الآن بانتظار الموافقة."
          : "Donation confirmation was sent to the administrator and is waiting for approval."
      );

      /*
       * Update this card immediately rather than reloading
       * the entire application.
       */
      setRequests((currentRequests) =>
        currentRequests.map((currentRequest) =>
          currentRequest._id === requestId
            ? {
              ...currentRequest,
              donation: confirmData.donation,
              confirmationStatus: "pending_admin_approval",
              canConfirm: false,
              waitingForAdmin: true,
              rejected: false,
              rejectionReason: null,
            }
            : currentRequest
        )
      );

      await fetchAssignedRequests();
    } catch (err) {
      console.error(
        "[ASSIGNED REQUESTS] Confirm donation error:",
        err
      );

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
              {/* <div className="flex gap-3 p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={() => handleCompleteDonation(request)}
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

              </div> */}
              {request.description && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white">
                  <p className="text-xs text-slate-600 mb-1">
                    {language === "ar" ? "الملاحظات" : "Notes"}
                  </p>

                  <p className="text-slate-700">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Replace the old Confirm/Cancel block with this */}
              <div className="border-t border-slate-200 bg-white p-4">
                {request.confirmationStatus === "pending_admin_approval" ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />

                      <div>
                        <p className="font-semibold text-yellow-800">
                          {language === "ar"
                            ? "بانتظار موافقة الإدارة"
                            : "Waiting for Administrator Approval"}
                        </p>

                        <p className="mt-1 text-sm text-yellow-700">
                          {language === "ar"
                            ? "تم إرسال تأكيد إتمام التبرع. لن يُحتسب التبرع حتى توافق الإدارة."
                            : "Your completion confirmation was submitted. The donation will not be counted until an administrator approves it."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {request.confirmationStatus === "rejected" && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

                          <div>
                            <p className="font-semibold text-red-800">
                              {language === "ar"
                                ? "تم رفض تأكيد التبرع"
                                : "Donation Confirmation Rejected"}
                            </p>

                            <p className="mt-1 text-sm text-red-700">
                              {request.rejectionReason ||
                                (language === "ar"
                                  ? "لم يتم تقديم سبب."
                                  : "No reason was provided.")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleCompleteDonation(request)}
                        disabled={
                          processingId === request._id ||
                          request.canConfirm === false
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === request._id ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                            {language === "ar"
                              ? "جارٍ الإرسال..."
                              : "Submitting..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5" />

                            {request.confirmationStatus === "rejected"
                              ? language === "ar"
                                ? "إعادة تأكيد التبرع"
                                : "Confirm Again"
                              : language === "ar"
                                ? "تأكيد إتمام التبرع"
                                : "Confirm Donation"}
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCancelAssignment(request._id)
                        }
                        disabled={processingId === request._id}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-5 w-5" />

                        {language === "ar"
                          ? "إلغاء التعيين"
                          : "Cancel Assignment"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
