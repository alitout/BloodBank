import React, { useEffect, useMemo, useState, } from "react";
import { AlertCircle, Loader, LogOut, UserCheck, } from "lucide-react";
import { useAuth, } from "./AuthContext.jsx";
import { useLanguage, } from "./LanguageContext.jsx";
import { authAPI, } from "../utils/api.js";
import { formatDateDDMMYYYY, parseDDMMYYYYToISO, } from "../utils/dateFormat.js";

export const ProfileCompletionModal = () => {
    const { user, logout, refreshUserProfile, } = useAuth();
    const { t } = useLanguage();
    const completion = user?.profileCompletion;
    const requiredDefinitions =
        useMemo(() => {
            if (!completion?.requirements) {
                return [];
            }

            return completion.requirements.filter(
                (requirement) =>
                    completion.fieldsRequiringAction
                        ?.includes(
                            requirement.field
                        )
            );
        }, [completion]);

    const [formData, setFormData] = useState({});
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!completion?.blocking) {
            setFormData({});
            setError("");
            return;
        }

        const initialValues = {};

        for (
            const requirement
            of requiredDefinitions
        ) {
            initialValues[requirement.field] =
                requirement.type === "date"
                    ? (
                        user?.[requirement.field]
                            ? new Date(
                                user[
                                requirement.field
                                ]
                            )
                                .toISOString()
                                .slice(0, 10)
                            : ""
                    )
                    : user?.[requirement.field] || "";
        }

        setFormData(initialValues);
    }, [
        completion?.blocking,
        requiredDefinitions,
        user,
    ]);

    if (!user || !completion?.blocking) {
        return null;
    }

    const handleChange = (field, value) => {
        setFormData((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const missingValue =
            requiredDefinitions.find(
                (requirement) =>
                    !formData[
                    requirement.field
                    ]
            );

        if (missingValue) {
            setError(
                t(
                    "requiredProfileInformationMissing"
                )
            );

            return;
        }

        setSubmitting(true);

        try {
            const submissionData = {
                ...formData,
            };

            for (
                const requirement
                of requiredDefinitions
            ) {
                if (
                    requirement.type !== "date"
                ) {
                    continue;
                }

                const isoDate =
                    parseDDMMYYYYToISO(
                        formData[
                        requirement.field
                        ]
                    );

                if (!isoDate) {
                    setError(
                        t("invalidDateFormat")
                    );

                    setSubmitting(false);
                    return;
                }

                submissionData[
                    requirement.field
                ] = isoDate;
            }

            const result =
                await authAPI.requestProfileUpdate(
                    submissionData
                );

            if (!result?.success) {
                throw new Error(
                    result?.error ||
                    result?.data?.message ||
                    t("profileCompletionFailed")
                );
            }

            await refreshUserProfile();
        } catch (submitError) {
            setError(
                submitError.message ||
                t("profileCompletionFailed")
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (requirement) => {
        const value =
            formData[requirement.field] || "";

        if (requirement.type === "date") {
            return (
                <input
                    type="date"
                    lang="en-GB"
                    value={value}
                    onChange={(event) =>
                        handleChange(
                            requirement.field,
                            event.target.value
                        )
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-red-600"
                    required
                />
            );
        }

        if (requirement.type === "select") {
            return (
                <select
                    value={value}
                    onChange={(event) =>
                        handleChange(
                            requirement.field,
                            event.target.value
                        )
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-red-600"
                    required
                >
                    <option value="">
                        {t("selectOption")}
                    </option>

                    {requirement.options?.map(
                        (option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {t(option.labelKey)}
                            </option>
                        )
                    )}
                </select>
            );
        }

        return (
            <input
                type={
                    requirement.type ||
                    "text"
                }
                value={value}
                onChange={(event) =>
                    handleChange(
                        requirement.field,
                        event.target.value
                    )
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-red-600"
                required
            />
        );
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 flex items-center justify-center p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-completion-title"
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="bg-red-600 text-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-7 h-7" />

                        <div>
                            <h2
                                id="profile-completion-title"
                                className="text-xl font-bold"
                            >
                                {t(
                                    "completeRequiredInformation"
                                )}
                            </h2>

                            <p className="text-sm text-red-100 mt-1">
                                {t(
                                    "completeRequiredInformationDescription"
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-6 space-y-5"
                >
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                        {t(
                            "profileCompletionApprovalNotice"
                        )}
                    </div>

                    {requiredDefinitions.map(
                        (requirement) => (
                            <div
                                key={requirement.field}
                            >
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t(
                                        requirement.labelKey
                                    )}
                                </label>

                                {renderField(
                                    requirement
                                )}
                            </div>
                        )
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                        {t(
                            "platformEligibilityDisclaimer"
                        )}
                    </div>

                    {error && (
                        <div className="flex gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-lg py-3 flex items-center justify-center gap-2"
                    >
                        {submitting && (
                            <Loader className="w-5 h-5 animate-spin" />
                        )}

                        {submitting
                            ? t(
                                "submittingProfileInformation"
                            )
                            : t(
                                "submitRequiredInformation"
                            )}
                    </button>

                    <button
                        type="button"
                        onClick={logout}
                        disabled={submitting}
                        className="w-full text-slate-600 hover:text-slate-900 text-sm flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        {t("logout")}
                    </button>
                </form>
            </div>
        </div>
    );
};