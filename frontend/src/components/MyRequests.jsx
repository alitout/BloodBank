import React, { useCallback, useEffect, useRef, useState, } from "react";
import { AlertCircle, Building2, Calendar, CheckCircle, Clock, Droplet, Eye, Loader, MapPin, XCircle, } from "lucide-react";
import { Truck01, } from "@untitledui/icons";
import { useNavigate, useLocation, } from "react-router-dom";
import { useAuth, } from "./AuthContext.jsx";
import { useLanguage, } from "./LanguageContext.jsx";
import { API_BASE_URL, getAccessToken, } from "../utils/api.js";
import { formatDateDDMMYYYY, } from "../utils/dateFormat.js";

const readResponse =
    async (response) => {
        const contentType =
            response.headers.get(
                "content-type"
            );

        if (
            contentType?.includes(
                "application/json"
            )
        ) {
            return response.json();
        }

        return {
            error:
                (await response.text()) ||
                `Request failed with status ${response.status}`,
        };
    };

const approvalClasses = {
    pending:
        "border-amber-200 bg-amber-50 text-amber-800",

    approved:
        "border-green-200 bg-green-50 text-green-800",

    rejected:
        "border-red-200 bg-red-50 text-red-800",
};

const requestStatusClasses = {
    pending:
        "bg-blue-100 text-blue-800",

    fulfilled:
        "bg-green-100 text-green-800",

    cancelled:
        "bg-slate-200 text-slate-700",
};

export const MyRequests = () => {
    const { accessToken, } = useAuth();
    const { t, language, } = useLanguage();
    const navigate = useNavigate();
    const [requests, setRequests,] = useState([]);
    const [page, setPage,] = useState(1);
    const [pages, setPages,] = useState(1);
    const [total, setTotal,] = useState(0);
    const [loading, setLoading,] = useState(true);
    const [error, setError,] = useState("");
    const requestInProgressRef = useRef(false);
    const refreshQueuedRef = useRef(false);
    const mountedRef = useRef(true);
    const location = useLocation();

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchMyRequests =
        useCallback(
            async ({
                showLoader = false,
            } = {}) => {
                if (
                    requestInProgressRef.current
                ) {
                    refreshQueuedRef.current =
                        true;

                    return;
                }

                requestInProgressRef.current =
                    true;

                try {
                    if (showLoader) {
                        setLoading(true);
                    }

                    const token =
                        getAccessToken() ||
                        accessToken;

                    if (!token) {
                        throw new Error(
                            t(
                                "authenticationRequired"
                            )
                        );
                    }

                    const response =
                        await fetch(
                            `${API_BASE_URL}/requesters/my-requests?page=${page}&limit=12`,
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
                        await readResponse(
                            response
                        );

                    if (!response.ok) {
                        throw new Error(
                            data?.error ||
                            t(
                                "myRequestsLoadFailed"
                            )
                        );
                    }

                    if (!mountedRef.current) {
                        return;
                    }

                    setRequests(
                        Array.isArray(
                            data?.requests
                        )
                            ? data.requests
                            : []
                    );

                    setTotal(
                        Number(data?.total) ||
                        0
                    );

                    setPages(
                        Math.max(
                            Number(data?.pages) ||
                            1,
                            1
                        )
                    );

                    setError("");
                } catch (fetchError) {
                    console.error(
                        "[MY REQUESTS] Fetch error:",
                        fetchError
                    );

                    if (mountedRef.current) {
                        setError(
                            fetchError.message
                        );
                    }
                } finally {
                    requestInProgressRef.current =
                        false;

                    if (mountedRef.current) {
                        setLoading(false);
                    }

                    const refreshAgain =
                        refreshQueuedRef.current;

                    refreshQueuedRef.current =
                        false;

                    if (
                        refreshAgain &&
                        mountedRef.current
                    ) {
                        window.setTimeout(
                            () => {
                                fetchMyRequests({
                                    showLoader:
                                        false,
                                });
                            },
                            0
                        );
                    }
                }
            },
            [
                accessToken,
                page,
                t,
            ]
        );

    useEffect(() => {
        fetchMyRequests({
            showLoader: true,
        });

        const intervalId =
            window.setInterval(
                () => {
                    fetchMyRequests({
                        showLoader: false,
                    });
                },
                10000
            );

        const handleRequestUpdate =
            () => {
                fetchMyRequests({
                    showLoader: false,
                });
            };

        window.addEventListener(
            "donor-request-updated",
            handleRequestUpdate
        );

        window.addEventListener(
            "donor-notifications-updated",
            handleRequestUpdate
        );

        return () => {
            window.clearInterval(
                intervalId
            );

            window.removeEventListener(
                "donor-request-updated",
                handleRequestUpdate
            );

            window.removeEventListener(
                "donor-notifications-updated",
                handleRequestUpdate
            );
        };
    }, [fetchMyRequests]);

    const getApprovalLabel =
        (request) => {
            if (
                request.approvalStatus ===
                "pending"
            ) {
                if (
                    request
                        .hospitalSelectionType ===
                    "other"
                ) {
                    return t(
                        "customHospitalRequiresReview"
                    );
                }

                return t(
                    "awaitingAdminApproval"
                );
            }

            if (
                request.approvalStatus ===
                "approved"
            ) {
                return t(
                    "requestApproved"
                );
            }

            if (
                request.approvalStatus ===
                "rejected"
            ) {
                return t(
                    "requestRejected"
                );
            }

            return request.approvalStatus;
        };

    if (
        loading &&
        requests.length === 0
    ) {
        return (
            <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-bold text-slate-900">
                    {t("myBloodRequests")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    {t(
                        "myBloodRequestsDescription"
                    )}
                </p>

                <p className="mt-2 text-sm font-semibold text-red-700">
                    {total}{" "}
                    {t("requestCount")}
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                    <div className="flex-1">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() =>
                                fetchMyRequests({
                                    showLoader: true,
                                })
                            }
                            className="mt-2 text-sm font-semibold underline"
                        >
                            {t("retry")}
                        </button>
                    </div>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
                    <Droplet className="mx-auto h-12 w-12 text-slate-400" />

                    <p className="mt-3 font-semibold text-slate-700">
                        {t("noMyBloodRequests")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        {t(
                            "noMyBloodRequestsDescription"
                        )}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(
                        (request) => {
                            const approvalStatus =
                                request
                                    .approvalStatus ||
                                "pending";

                            const requestStatus =
                                request.status ||
                                "pending";

                            const hospitalName =
                                request
                                    .hospitalSelectionType ===
                                    "other"
                                    ? request
                                        .customHospital
                                        ?.name ||
                                    request.hospital
                                    : request.hospital;

                            return (
                                <article
                                    key={
                                        request._id ||
                                        request.id
                                    }
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                {request.fname}{" "}
                                                {request.fatherName}{" "}
                                                {request.lname}
                                            </h3>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {formatDateDDMMYYYY(
                                                    request.createdAt
                                                ) || "—"}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-start">
                                            <span
                                                className={`inline-flex h-fit items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold leading-none ${requestStatusClasses[
                                                    requestStatus
                                                ] ||
                                                    "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {t(requestStatus)}
                                            </span>

                                            <span
                                                className={`inline-flex h-fit items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-none ${approvalClasses[
                                                    approvalStatus
                                                ] ||
                                                    "border-slate-200 bg-slate-50 text-slate-700"
                                                    }`}
                                            >
                                                {getApprovalLabel(
                                                    request
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="flex items-start gap-2">
                                            <Droplet className="mt-0.5 h-5 w-5 text-red-600" />

                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    {t("bloodType")}
                                                </p>

                                                <p className="font-semibold text-slate-900">
                                                    {request.bloodType}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <Building2 className="mt-0.5 h-5 w-5 text-blue-600" />

                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    {t("hospitalName")}
                                                </p>

                                                <p className="font-semibold text-slate-900">
                                                    {hospitalName ||
                                                        t("notProvided")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />

                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    {t("unitsNeeded")}
                                                </p>

                                                <p className="font-semibold text-slate-900">
                                                    {request.unitsNeeded}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <Calendar className="mt-0.5 h-5 w-5 text-purple-600" />

                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    {t("date")}
                                                </p>

                                                <p className="font-semibold text-slate-900">
                                                    {formatDateDDMMYYYY(
                                                        request.date
                                                    ) ||
                                                        request.date ||
                                                        "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 px-4 py-3">
                                        <p
                                            className={`flex items-center gap-2 text-sm font-semibold ${request
                                                .transportationAvailable
                                                ? "text-red-700"
                                                : "text-slate-600"
                                                }`}
                                        >
                                            <Truck01 className="h-5 w-5" />

                                            {request
                                                .transportationAvailable
                                                ? t(
                                                    "transportationAvailable"
                                                )
                                                : t(
                                                    "transportationNotAvailable"
                                                )}
                                        </p>
                                    </div>

                                    {approvalStatus ===
                                        "pending" && (
                                            <div className="border-t border-amber-200 bg-amber-50 p-4">
                                                <div className="flex items-start gap-2">
                                                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                                                    <p className="text-sm text-amber-800">
                                                        {request
                                                            .hospitalSelectionType ===
                                                            "other"
                                                            ? t(
                                                                "waitingForHospitalReview"
                                                            )
                                                            : t(
                                                                "waitingForRequestApproval"
                                                            )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                    {approvalStatus ===
                                        "rejected" && (
                                            <div className="border-t border-red-200 bg-red-50 p-4">
                                                <div className="flex items-start gap-2">
                                                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                                                    <div>
                                                        <p className="font-semibold text-red-800">
                                                            {t(
                                                                "requestRejected"
                                                            )}
                                                        </p>

                                                        <p className="mt-1 text-sm text-red-700">
                                                            {request
                                                                .rejectionReason ||
                                                                t(
                                                                    "noReasonProvided"
                                                                )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    <div className="border-t border-slate-200 p-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/request-detail/${request._id}`,
                                                    {
                                                        state: {
                                                            from:
                                                                `${location.pathname}${location.search}`,
                                                        },
                                                    }
                                                )
                                            }
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                                        >
                                            <Eye className="h-4 w-4" />

                                            {t("viewRequestDetails")}
                                        </button>
                                    </div>
                                </article>
                            );
                        }
                    )}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            setPage(
                                (current) =>
                                    Math.max(
                                        current - 1,
                                        1
                                    )
                            )
                        }
                        disabled={page <= 1}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                        {t("previous")}
                    </button>

                    <span className="text-sm text-slate-600">
                        {page} / {pages}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setPage(
                                (current) =>
                                    Math.min(
                                        current + 1,
                                        pages
                                    )
                            )
                        }
                        disabled={page >= pages}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                        {t("next")}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MyRequests;