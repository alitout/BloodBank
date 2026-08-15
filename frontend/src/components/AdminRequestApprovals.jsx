import React, { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { AlertCircle, Building2, CheckCircle, Loader, Mail, MapPin, Phone, XCircle, } from "lucide-react";
import { API_BASE_URL, getAccessToken, } from "../utils/api.js";
import { useAuth, } from "./AuthContext.jsx";
import { useLanguage, } from "./LanguageContext.jsx";

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

export const AdminRequestApprovals = ({
    onCountsChange,
}) => {
    const { accessToken } = useAuth();
    const { t } = useLanguage();
    const [requests, setRequests,] = useState([]);
    const [loading, setLoading,] = useState(true);
    const [error, setError,] = useState("");
    const [processingId, setProcessingId,] = useState(null);
    const [hospitalRequest, setHospitalRequest,] = useState(null);
    const [hospitalForm, setHospitalForm,] = useState({
        name: "",
        location: "",
        phoneNumber: "",
        address: "",
    });
    const requestInProgressRef = useRef(false);
    const componentMountedRef = useRef(true);
    useEffect(() => {
        componentMountedRef.current =
            true;

        return () => {
            componentMountedRef.current =
                false;
        };
    }, []);

    const customHospitalRequests =
        useMemo(
            () =>
                requests.filter(
                    (request) =>
                        request
                            .hospitalSelectionType ===
                        "other"
                ),
            [requests]
        );

    const requestsReadyForApproval =
        useMemo(
            () =>
                requests.filter(
                    (request) =>
                        request
                            .hospitalSelectionType !==
                        "other"
                ),
            [requests]
        );

    useEffect(() => {
        onCountsChange?.({
            requests:
                requests.length,

            hospitals:
                customHospitalRequests.length,
        });
    }, [
        requests.length,
        customHospitalRequests.length,
        onCountsChange,
    ]);

    const fetchRequests =
        useCallback(
            async ({
                showLoader = false,
            } = {}) => {
                if (
                    requestInProgressRef.current
                ) {
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
                            `${API_BASE_URL}/requesters/admin/pending-approval`,
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
                                "requestApprovalsLoadFailed"
                            )
                        );
                    }

                    const receivedRequests =
                        Array.isArray(data)
                            ? data
                            : Array.isArray(
                                data?.requests
                            )
                                ? data.requests
                                : [];

                    if (
                        componentMountedRef.current
                    ) {
                        setRequests(
                            receivedRequests
                        );

                        setError("");
                    }
                } catch (
                fetchError
                ) {
                    console.error(
                        "[ADMIN REQUEST APPROVALS] Fetch:",
                        fetchError
                    );

                    if (
                        componentMountedRef.current
                    ) {
                        setError(
                            fetchError.message
                        );
                    }
                } finally {
                    requestInProgressRef.current =
                        false;

                    if (
                        componentMountedRef.current
                    ) {
                        setLoading(false);
                    }
                }
            },
            [
                accessToken,
                t,
            ]
        );

    useEffect(() => {
        fetchRequests({
            showLoader: true,
        });

        const intervalId =
            window.setInterval(
                () =>
                    fetchRequests({
                        showLoader: false,
                    }),
                10000
            );

        const handleUpdate =
            () =>
                fetchRequests({
                    showLoader: false,
                });

        window.addEventListener(
            "admin-pending-updated",
            handleUpdate
        );

        return () => {
            window.clearInterval(
                intervalId
            );

            window.removeEventListener(
                "admin-pending-updated",
                handleUpdate
            );
        };
    }, [fetchRequests]);

    const removeProcessedRequest =
        (requestId) => {
            setRequests(
                (current) =>
                    current.filter(
                        (request) =>
                            request._id !==
                            requestId
                    )
            );

            window.dispatchEvent(
                new CustomEvent(
                    "admin-pending-updated"
                )
            );
        };

    const handleApprove =
        async (requestId) => {
            try {
                setProcessingId(
                    requestId
                );

                setError("");

                const token =
                    getAccessToken() ||
                    accessToken;

                const response =
                    await fetch(
                        `${API_BASE_URL}/requesters/admin/${requestId}/approve`,
                        {
                            method: "PATCH",

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
                            "requestApprovalActionFailed"
                        )
                    );
                }

                removeProcessedRequest(
                    requestId
                );
            } catch (
            approveError
            ) {
                setError(
                    approveError.message
                );
            } finally {
                setProcessingId(
                    null
                );
            }
        };

    const handleReject =
        async (requestId) => {
            const enteredReason =
                window.prompt(
                    t(
                        "requestRejectionReasonPrompt"
                    )
                );

            if (
                enteredReason === null
            ) {
                return;
            }

            const rejectionReason =
                enteredReason.trim();

            if (!rejectionReason) {
                setError(
                    t(
                        "rejectionReasonRequired"
                    )
                );

                return;
            }

            try {
                setProcessingId(
                    requestId
                );

                setError("");

                const token =
                    getAccessToken() ||
                    accessToken;

                const response =
                    await fetch(
                        `${API_BASE_URL}/requesters/admin/${requestId}/reject`,
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
                                    rejectionReason,
                                }),
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
                            "requestApprovalActionFailed"
                        )
                    );
                }

                removeProcessedRequest(
                    requestId
                );
            } catch (
            rejectError
            ) {
                setError(
                    rejectError.message
                );
            } finally {
                setProcessingId(
                    null
                );
            }
        };

    const openHospitalReview =
        (request) => {
            setHospitalRequest(
                request
            );

            setHospitalForm({
                name:
                    request
                        .customHospital
                        ?.name ||
                    request.hospital ||
                    "",

                address:
                    request
                        .customHospital
                        ?.address ||
                    "",

                location: "",

                phoneNumber: "",
            });

            setError("");
        };

    const closeHospitalReview =
        () => {
            if (processingId) {
                return;
            }

            setHospitalRequest(
                null
            );

            setHospitalForm({
                name: "",
                location: "",
                phoneNumber: "",
                address: "",
            });
        };

    const handleHospitalChange =
        (event) => {
            const {
                name,
                value,
            } = event.target;

            setHospitalForm(
                (current) => ({
                    ...current,
                    [name]: value,
                })
            );
        };

    const handleSaveHospital =
        async (event) => {
            event.preventDefault();

            if (!hospitalRequest?._id) {
                return;
            }

            const cleanedForm = {
                name:
                    hospitalForm.name.trim(),

                location:
                    hospitalForm.location.trim(),

                phoneNumber:
                    hospitalForm
                        .phoneNumber
                        .trim(),

                address:
                    hospitalForm.address.trim(),
            };

            if (
                Object.values(
                    cleanedForm
                ).some(
                    (value) => !value
                )
            ) {
                setError(
                    t(
                        "allHospitalFieldsRequired"
                    )
                );

                return;
            }

            try {
                setProcessingId(
                    hospitalRequest._id
                );

                setError("");

                const token =
                    getAccessToken() ||
                    accessToken;

                const response =
                    await fetch(
                        `${API_BASE_URL}/requesters/admin/${hospitalRequest._id}/register-custom-hospital`,
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
                                JSON.stringify(
                                    cleanedForm
                                ),
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
                            "hospitalCreationFailed"
                        )
                    );
                }

                setRequests(
                    (current) =>
                        current.map(
                            (request) =>
                                request._id ===
                                    hospitalRequest._id
                                    ? {
                                        ...data.requester,

                                        requesterContact:
                                            data
                                                .requester
                                                ?.requesterContact ||
                                            request
                                                .requesterContact,
                                    }
                                    : request
                        )
                );

                closeHospitalReview();

                window.dispatchEvent(
                    new CustomEvent(
                        "admin-pending-updated"
                    )
                );
            } catch (
            hospitalError
            ) {
                setError(
                    hospitalError.message
                );
            } finally {
                setProcessingId(
                    null
                );
            }
        };

    const renderContact =
        (request) => (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />

                    {request
                        .requesterContact
                        ?.phone ||
                        t("notProvided")}
                </p>

                <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />

                    {request
                        .requesterContact
                        ?.email ||
                        t("notProvided")}
                </p>
            </div>
        );

    if (
        loading &&
        requests.length === 0
    ) {
        return (
            <div className="flex justify-center py-8">
                <Loader className="h-7 w-7 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <section
                id="pending-custom-hospitals"
                className="scroll-mt-24 space-y-4"
            >
                <h4 className="font-bold text-slate-900">
                    {t(
                        "pendingCustomHospitals"
                    )}{" "}
                    (
                    {
                        customHospitalRequests.length
                    }
                    )
                </h4>

                {customHospitalRequests.length ===
                    0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                        {t(
                            "noPendingCustomHospitals"
                        )}
                    </p>
                ) : (
                    customHospitalRequests.map(
                        (request) => (
                            <div
                                key={request._id}
                                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                                    <div className="flex-1">
                                        <p className="font-bold text-amber-900">
                                            {request
                                                .customHospital
                                                ?.name ||
                                                request.hospital}
                                        </p>

                                        <p className="mt-1 flex items-start gap-2 text-sm text-amber-800">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                                            {request
                                                .customHospital
                                                ?.address ||
                                                t(
                                                    "notProvided"
                                                )}
                                        </p>

                                        <p className="mt-3 text-sm text-slate-700">
                                            {request.fname}{" "}
                                            {request.fatherName}{" "}
                                            {request.lname} —{" "}
                                            {request.bloodType}
                                        </p>

                                        {renderContact(
                                            request
                                        )}

                                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openHospitalReview(
                                                        request
                                                    )
                                                }
                                                disabled={
                                                    processingId ===
                                                    request._id
                                                }
                                                className="flex-1 rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                                            >
                                                {t(
                                                    "reviewAndAddHospital"
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleReject(
                                                        request._id
                                                    )
                                                }
                                                disabled={
                                                    processingId ===
                                                    request._id
                                                }
                                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                {t("reject")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )
                )}
            </section>

            <section id="request-approvals" className="space-y-4">
                <h4 className="font-bold text-slate-900">
                    {t(
                        "requestsReadyForApproval"
                    )}{" "}
                    (
                    {
                        requestsReadyForApproval.length
                    }
                    )
                </h4>

                {requestsReadyForApproval.length ===
                    0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
                        {t(
                            "noRequestsReadyForApproval"
                        )}
                    </p>
                ) : (
                    requestsReadyForApproval.map(
                        (request) => (
                            <div
                                key={request._id}
                                className="rounded-lg border border-slate-200 bg-white p-4"
                            >
                                <h4 className="font-bold text-slate-900">
                                    {request.fname}{" "}
                                    {request.fatherName}{" "}
                                    {request.lname}
                                </h4>

                                <p className="mt-2 text-sm text-slate-700">
                                    {request.bloodType} —{" "}
                                    {request.unitsNeeded}{" "}
                                    {t("units")} —{" "}
                                    {request.hospital}
                                </p>

                                {renderContact(
                                    request
                                )}

                                <div className="mt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleApprove(
                                                request._id
                                            )
                                        }
                                        disabled={
                                            processingId ===
                                            request._id
                                        }
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {t("approve")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleReject(
                                                request._id
                                            )
                                        }
                                        disabled={
                                            processingId ===
                                            request._id
                                        }
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        {t("reject")}
                                    </button>
                                </div>
                            </div>
                        )
                    )
                )}
            </section>

            {hospitalRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <form
                        onSubmit={
                            handleSaveHospital
                        }
                        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
                    >
                        <h3 className="text-lg font-bold text-slate-900">
                            {t(
                                "reviewCustomHospital"
                            )}
                        </h3>

                        {[
                            [
                                "name",
                                t(
                                    "hospitalName"
                                ),
                            ],
                            [
                                "location",
                                t("location"),
                            ],
                            [
                                "phoneNumber",
                                t(
                                    "phoneNumber"
                                ),
                            ],
                            [
                                "address",
                                t("address"),
                            ],
                        ].map(
                            ([
                                field,
                                label,
                            ]) => (
                                <label
                                    key={field}
                                    className="block"
                                >
                                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                                        {label}
                                    </span>

                                    <input
                                        name={field}
                                        value={
                                            hospitalForm[
                                            field
                                            ]
                                        }
                                        onChange={
                                            handleHospitalChange
                                        }
                                        required
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-red-600 focus:outline-none"
                                    />
                                </label>
                            )
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={
                                    closeHospitalReview
                                }
                                disabled={Boolean(
                                    processingId
                                )}
                                className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
                            >
                                {t("cancel")}
                            </button>

                            <button
                                type="submit"
                                disabled={Boolean(
                                    processingId
                                )}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                            >
                                {processingId && (
                                    <Loader className="h-4 w-4 animate-spin" />
                                )}

                                {t(
                                    "addHospital"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminRequestApprovals;