import React, { useState, } from "react";
import { ArrowRight, Droplet, HeartHandshake, } from "lucide-react";
import { Navigate, useNavigate, } from "react-router-dom";
import { useAuth, } from "../components/AuthContext.jsx";
import { useLanguage, } from "../components/LanguageContext.jsx";
import { DONOR_INTENTS, getDonorIntentDestination, saveDonorIntent, } from "../utils/donorIntent.js";
import { SignOutButton, } from "../components/SignOutButton.jsx";


export default function DonorIntentPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [rememberChoice, setRememberChoice,] = useState(false);
    const [selectingIntent, setSelectingIntent,] = useState(false);

    if (!user) {
        return (
            <Navigate to="/login" replace />
        );
    }

    if (user.role === "super_admin"
    ) {
        return (
            <Navigate to="/admin" replace />
        );
    }

    if (user.role !== "donor") {
        return (
            <Navigate
                to="/dashboard" replace
            />
        );
    }

    const selectIntent = (intent) => {
        if (selectingIntent) {
            return;
        }
        setSelectingIntent(true);
        const saved =
            saveDonorIntent({
                uid: user.uid,
                intent,
                remember: rememberChoice,
            });
        if (!saved) {
            setSelectingIntent(false);
            window.alert(t("failedToSavePurpose"));
            return;
        }
        const destination =
            getDonorIntentDestination(intent);

        navigate(destination, { replace: true, }
        );
    };

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-500">
                            {user?.fname} {user?.lname}
                        </p>
                    </div>

                    <SignOutButton />
                </div>

                <div className="mx-auto max-w-4xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-black text-slate-900">
                            {t(
                                "whyAreYouHereToday"
                            )}
                        </h1>

                        <p className="mt-3 text-slate-600">
                            {t(
                                "chooseDonorIntentDescription"
                            )}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Donate */}
                        <button
                            type="button"
                            disabled={selectingIntent}
                            onClick={() =>
                                selectIntent(
                                    DONOR_INTENTS.DONATE
                                )
                            }
                            className="group rounded-2xl border-2 border-red-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-red-500 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-wait disabled:opacity-60"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                                <HeartHandshake className="h-7 w-7" />
                            </div>

                            <h2 className="text-xl font-black text-slate-900">
                                {t(
                                    "iWantToDonate"
                                )}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {t(
                                    "iWantToDonateDescription"
                                )}
                            </p>

                            <span className="mt-6 flex items-center gap-2 font-bold text-red-600">
                                {t(
                                    "viewDonationRequests"
                                )}

                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </button>

                        {/* Request blood */}
                        <button
                            type="button"
                            disabled={selectingIntent}
                            onClick={() =>
                                selectIntent(
                                    DONOR_INTENTS.REQUEST_BLOOD
                                )
                            }
                            className="group rounded-2xl border-2 border-blue-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
                        >
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <Droplet className="h-7 w-7" />
                            </div>

                            <h2 className="text-xl font-black text-slate-900">
                                {t(
                                    "iWantToRequestBlood"
                                )}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {t(
                                    "iWantToRequestBloodDescription"
                                )}
                            </p>

                            <span className="mt-6 flex items-center gap-2 font-bold text-blue-600">
                                {t(
                                    "createBloodRequest"
                                )}

                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </span>
                        </button>
                    </div>

                    <label className="mx-auto mt-7 flex w-fit cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                        <input
                            type="checkbox"
                            checked={
                                rememberChoice
                            }
                            onChange={(event) =>
                                setRememberChoice(
                                    event.target.checked
                                )
                            }
                            className="h-4 w-4 accent-red-600"
                        />

                        <span>
                            {t(
                                "rememberMyPurpose"
                            )}
                        </span>
                    </label>

                    <div className="mt-7 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                        <p className="text-sm text-blue-800">
                            {t(
                                "intentScreenDisclaimer"
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}