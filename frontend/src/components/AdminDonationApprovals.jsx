import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Droplet, Loader, XCircle } from "lucide-react";

import { useAuth } from "./AuthContext.jsx";
import { useLanguage } from "./LanguageContext.jsx";
import { API_BASE_URL, getAccessToken } from "../utils/api.js";

const readResponseData = async (response) => {
    const contentType =
        response.headers.get("content-type");

    if (
        contentType?.includes(
            "application/json"
        )
    ) {
        return response.json();
    }

    const text = await response.text();

    return {
        error:
            text ||
            `Request failed with status ${response.status}`,
    };
};

export const AdminDonationApprovals =
    () => {
        const { accessToken } = useAuth();
        const { language } = useLanguage();
        const [pendingDonations, setPendingDonations] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState("");
        const [success, setSuccess] = useState("");
        const [processingId, setProcessingId,] = useState(null);
        const [rejectingDonation, setRejectingDonation,] = useState(null);
        const [rejectionReason, setRejectionReason,] = useState("");

        const fetchPendingDonations =
            useCallback(
                async ({
                    showLoader = false,
                } = {}) => {
                    const token =
                        getAccessToken() ||
                        accessToken;

                    if (!token) {
                        setPendingDonations([]);
                        setLoading(false);

                        return;
                    }

                    try {
                        if (showLoader) {
                            setLoading(true);
                        }

                        setError("");

                        const response =
                            await fetch(
                                `${API_BASE_URL}/donations/admin/pending`,
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
                            await readResponseData(
                                response
                            );

                        if (!response.ok) {
                            throw new Error(
                                data?.error ||
                                (language === "ar"
                                    ? "تعذر تحميل التبرعات المعلقة."
                                    : "Failed to load pending donations.")
                            );
                        }

                        const donations =
                            Array.isArray(data)
                                ? data
                                : Array.isArray(
                                    data?.donations
                                )
                                    ? data.donations
                                    : [];

                        setPendingDonations(
                            donations
                        );
                    } catch (fetchError) {
                        console.error(
                            "[ADMIN DONATIONS] Fetch error:",
                            fetchError
                        );

                        setError(
                            fetchError.message
                        );
                    } finally {
                        setLoading(false);
                    }
                },
                [accessToken, language]
            );

        useEffect(() => {
            fetchPendingDonations({
                showLoader: true,
            });

            const intervalId =
                window.setInterval(() => {
                    fetchPendingDonations();
                }, 10000);

            return () => {
                window.clearInterval(
                    intervalId
                );
            };
        }, [fetchPendingDonations]);

        useEffect(() => {
            const handlePendingUpdate =
                () => {
                    fetchPendingDonations();
                };

            window.addEventListener(
                "pending-donations-updated",
                handlePendingUpdate
            );

            return () => {
                window.removeEventListener(
                    "pending-donations-updated",
                    handlePendingUpdate
                );
            };
        }, [fetchPendingDonations]);

        useEffect(() => {
            if (!success) {
                return undefined;
            }

            const timeoutId =
                window.setTimeout(() => {
                    setSuccess("");
                }, 5000);

            return () => {
                window.clearTimeout(
                    timeoutId
                );
            };
        }, [success]);

        const broadcastPendingUpdate =
            () => {
                window.dispatchEvent(
                    new CustomEvent(
                        "pending-donations-updated"
                    )
                );
            };

        const handleApprove = async (
            donationId
        ) => {
            if (!donationId) {
                setError(
                    language === "ar"
                        ? "معرّف التبرع غير موجود."
                        : "Donation ID is missing."
                );

                return;
            }

            const confirmed =
                window.confirm(
                    language === "ar"
                        ? "هل تريد الموافقة على إتمام هذا التبرع؟"
                        : "Approve this donation completion?"
                );

            if (!confirmed) {
                return;
            }

            try {
                setProcessingId(
                    donationId
                );

                setError("");
                setSuccess("");

                const token =
                    getAccessToken() ||
                    accessToken;

                if (!token) {
                    throw new Error(
                        language === "ar"
                            ? "انتهت جلسة الدخول."
                            : "Authentication session is missing."
                    );
                }

                const response =
                    await fetch(
                        `${API_BASE_URL}/donations/admin/${donationId}/approve`,
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

                const data =
                    await readResponseData(
                        response
                    );

                if (!response.ok) {
                    throw new Error(
                        data?.error ||
                        (language === "ar"
                            ? "تعذر اعتماد التبرع."
                            : "Failed to approve the donation.")
                    );
                }

                setPendingDonations(
                    (current) =>
                        current.filter(
                            (donation) =>
                                donation.donationId !==
                                donationId
                        )
                );

                setSuccess(
                    language === "ar"
                        ? "تم اعتماد التبرع وتحديث حالة المتبرع بنجاح."
                        : "Donation approved and donor status updated successfully."
                );

                broadcastPendingUpdate();
            } catch (approveError) {
                console.error(
                    "[ADMIN DONATIONS] Approve error:",
                    approveError
                );

                setError(
                    approveError.message
                );

                /*
                 * The donation might have been handled
                 * in another tab. Refresh the list.
                 */
                await fetchPendingDonations();
            } finally {
                setProcessingId(null);
            }
        };

        const openRejectDialog = (
            donation
        ) => {
            setRejectingDonation(
                donation
            );

            setRejectionReason("");
            setError("");
            setSuccess("");
        };

        const closeRejectDialog =
            () => {
                if (processingId) {
                    return;
                }

                setRejectingDonation(
                    null
                );

                setRejectionReason("");
            };

        const handleReject =
            async () => {
                const donationId =
                    rejectingDonation
                        ?.donationId;

                const reason =
                    rejectionReason.trim();

                if (!donationId) {
                    setError(
                        language === "ar"
                            ? "معرّف التبرع غير موجود."
                            : "Donation ID is missing."
                    );

                    return;
                }

                if (!reason) {
                    setError(
                        language === "ar"
                            ? "يرجى كتابة سبب الرفض."
                            : "A rejection reason is required."
                    );

                    return;
                }

                try {
                    setProcessingId(
                        donationId
                    );

                    setError("");
                    setSuccess("");

                    const token =
                        getAccessToken() ||
                        accessToken;

                    if (!token) {
                        throw new Error(
                            language === "ar"
                                ? "انتهت جلسة الدخول."
                                : "Authentication session is missing."
                        );
                    }

                    const response =
                        await fetch(
                            `${API_BASE_URL}/donations/admin/${donationId}/reject`,
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
                                body:
                                    JSON.stringify({
                                        rejectionReason:
                                            reason,
                                    }),
                            }
                        );

                    const data =
                        await readResponseData(
                            response
                        );

                    if (!response.ok) {
                        throw new Error(
                            data?.error ||
                            (language === "ar"
                                ? "تعذر رفض تأكيد التبرع."
                                : "Failed to reject the donation confirmation.")
                        );
                    }

                    setPendingDonations(
                        (current) =>
                            current.filter(
                                (donation) =>
                                    donation.donationId !==
                                    donationId
                            )
                    );

                    setRejectingDonation(
                        null
                    );

                    setRejectionReason("");

                    setSuccess(
                        language === "ar"
                            ? "تم رفض تأكيد التبرع وإرسال إشعار إلى المتبرع."
                            : "Donation confirmation rejected and the donor was notified."
                    );

                    /*
                     * This was missing from the previous version.
                     * It refreshes the bell and other pending lists.
                     */
                    broadcastPendingUpdate();
                } catch (rejectError) {
                    console.error(
                        "[ADMIN DONATIONS] Reject error:",
                        rejectError
                    );

                    setError(
                        rejectError.message
                    );

                    await fetchPendingDonations();
                } finally {
                    setProcessingId(null);
                }
            };

        if (loading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-red-600" />
                </div>
            );
        }

        return (
            <div className="space-y-5">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-yellow-600" />

                        <div>
                            <h2 className="font-bold text-yellow-900">
                                {language === "ar"
                                    ? "تأكيدات التبرع المعلقة"
                                    : "Pending Donation Confirmations"}
                            </h2>

                            <p className="text-sm text-yellow-700">
                                {
                                    pendingDonations.length
                                }{" "}
                                {language === "ar"
                                    ? "تأكيد بانتظار المراجعة"
                                    : "confirmation(s) awaiting review"}
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

                        <p className="flex-1 text-red-700">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                fetchPendingDonations({
                                    showLoader: true,
                                })
                            }
                            className="text-sm font-semibold text-red-700 underline"
                        >
                            {language === "ar"
                                ? "إعادة المحاولة"
                                : "Retry"}
                        </button>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />

                        <p className="text-green-700">
                            {success}
                        </p>
                    </div>
                )}

                {pendingDonations.length ===
                    0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center">
                        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-slate-400" />

                        <p className="text-slate-600">
                            {language === "ar"
                                ? "لا توجد تأكيدات تبرع معلقة."
                                : "No pending donation confirmations."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingDonations.map(
                            (donation) => {
                                const request =
                                    donation.requestId &&
                                        typeof donation.requestId ===
                                        "object"
                                        ? donation.requestId
                                        : {};

                                const donor =
                                    donation.donor || {};

                                const isProcessing =
                                    processingId ===
                                    donation.donationId;

                                const units =
                                    donation.unitsCompleted ??
                                    donation.unitsAssigned ??
                                    0;

                                const patientName = [
                                    request.fname,
                                    request.fatherName,
                                    request.lname,
                                ]
                                    .filter(Boolean)
                                    .join(" ");

                                return (
                                    <div
                                        key={
                                            donation._id ||
                                            donation.donationId
                                        }
                                        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex flex-col justify-between gap-4 md:flex-row">
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500">
                                                        {language ===
                                                            "ar"
                                                            ? "المتبرع"
                                                            : "Donor"}
                                                    </p>

                                                    <p className="font-bold text-slate-900">
                                                        {[
                                                            donor.fname,
                                                            donor.lname,
                                                        ]
                                                            .filter(
                                                                Boolean
                                                            )
                                                            .join(" ") ||
                                                            "—"}
                                                    </p>

                                                    <p className="text-sm text-slate-600">
                                                        {donor.email ||
                                                            "—"}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-4 text-sm">
                                                    <span className="flex items-center gap-1 text-red-700">
                                                        <Droplet className="h-4 w-4" />

                                                        {donor.bloodType ||
                                                            request.bloodType ||
                                                            "—"}
                                                    </span>

                                                    <span>
                                                        {language ===
                                                            "ar"
                                                            ? "الوحدات: "
                                                            : "Units: "}

                                                        <strong>
                                                            {units}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        {language ===
                                                            "ar"
                                                            ? "المستشفى: "
                                                            : "Hospital: "}

                                                        <strong>
                                                            {request.hospital ||
                                                                "—"}
                                                        </strong>
                                                    </span>
                                                </div>

                                                <p className="text-sm text-slate-600">
                                                    {language === "ar"
                                                        ? "المريض: "
                                                        : "Patient: "}

                                                    <strong>
                                                        {patientName ||
                                                            "—"}
                                                    </strong>
                                                </p>

                                                {donation.donorCompletedAt && (
                                                    <p className="text-xs text-slate-500">
                                                        {language === "ar"
                                                            ? "تم التأكيد في: "
                                                            : "Confirmed at: "}

                                                        {new Date(
                                                            donation.donorCompletedAt
                                                        ).toLocaleString(
                                                            language ===
                                                                "ar"
                                                                ? "ar-LB"
                                                                : "en-GB"
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex min-w-44 flex-col gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleApprove(
                                                            donation.donationId
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        Boolean(
                                                            processingId
                                                        )
                                                    }
                                                    className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isProcessing ? (
                                                        <Loader className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}

                                                    {isProcessing
                                                        ? language ===
                                                            "ar"
                                                            ? "جارٍ التنفيذ..."
                                                            : "Processing..."
                                                        : language ===
                                                            "ar"
                                                            ? "موافقة"
                                                            : "Approve"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openRejectDialog(
                                                            donation
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ||
                                                        Boolean(
                                                            processingId
                                                        )
                                                    }
                                                    className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <XCircle className="h-4 w-4" />

                                                    {language === "ar"
                                                        ? "رفض"
                                                        : "Reject"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}

                {rejectingDonation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-slate-900">
                                {language === "ar"
                                    ? "رفض تأكيد التبرع"
                                    : "Reject Donation Confirmation"}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                                {language === "ar"
                                    ? "سيظهر سبب الرفض للمتبرع، وسيعود الطلب إلى قائمة طلباته."
                                    : "The donor will see this reason, and the request will return to their assigned requests."}
                            </p>

                            <textarea
                                value={
                                    rejectionReason
                                }
                                onChange={(event) =>
                                    setRejectionReason(
                                        event.target.value
                                    )
                                }
                                rows={4}
                                maxLength={500}
                                placeholder={
                                    language === "ar"
                                        ? "اكتب سبب الرفض..."
                                        : "Enter the rejection reason..."
                                }
                                className="mt-4 w-full rounded-lg border border-slate-300 p-3 focus:border-red-500 focus:outline-none"
                            />

                            <p className="mt-1 text-right text-xs text-slate-400">
                                {
                                    rejectionReason.length
                                }
                                /500
                            </p>

                            <div className="mt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={
                                        closeRejectDialog
                                    }
                                    disabled={Boolean(
                                        processingId
                                    )}
                                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {language === "ar"
                                        ? "إلغاء"
                                        : "Cancel"}
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleReject
                                    }
                                    disabled={
                                        Boolean(
                                            processingId
                                        ) ||
                                        !rejectionReason.trim()
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processingId && (
                                        <Loader className="h-4 w-4 animate-spin" />
                                    )}

                                    {processingId
                                        ? language ===
                                            "ar"
                                            ? "جارٍ الرفض..."
                                            : "Rejecting..."
                                        : language ===
                                            "ar"
                                            ? "تأكيد الرفض"
                                            : "Confirm Rejection"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

export default AdminDonationApprovals;
