import { formatDateDDMMYYYY, } from "./dateFormat.js";

const REASON_TRANSLATION_KEYS = {
    ACCOUNT_NOT_VERIFIED: "eligibilityAccountNotVerified",
    ACCOUNT_DEFERRED: "eligibilityAccountDeferred",
    ELIGIBILITY_PROFILE_INCOMPLETE: "eligibilityProfileIncomplete",
    DONOR_AGE_OUT_OF_RANGE: "eligibilityAgeOutOfRange",
    BLOOD_TYPE_NOT_COMPATIBLE: "eligibilityBloodTypeIncompatible",
    WHOLE_BLOOD_COOLDOWN_ACTIVE: "eligibilityWholeBloodCooldown",
    WHOLE_BLOOD_ANNUAL_LIMIT_REACHED: "eligibilityWholeBloodAnnualLimit",
    PLATELET_COOLDOWN_ACTIVE: "eligibilityPlateletCooldown",
    PLATELET_WEEKLY_LIMIT_REACHED: "eligibilityPlateletWeeklyLimit",
    PLATELET_ANNUAL_LIMIT_REACHED: "eligibilityPlateletAnnualLimit",
    RECENT_WHOLE_BLOOD_DONATION: "eligibilityRecentWholeBlood",
    PLASMA_COOLDOWN_ACTIVE: "eligibilityPlasmaCooldown",
    INVALID_DONATION_TYPE: "eligibilityInvalidDonationType",
};

export const getConnectionBlockReason = (assessment, t) => {
    if (!assessment) {
        return t("eligibilityInformationUnavailable");
    }

    if (assessment.platformEligible) {
        return "";
    }

    const reason = assessment.reasons?.[0];

    const translationKey = REASON_TRANSLATION_KEYS[reason];

    const reasonText = translationKey ? t(translationKey) : t("notPlatformEligible");

    if (assessment.nextEligibleDate) {
        return `${reasonText} ${t(
            "nextEligibleDate"
        )}: ${formatDateDDMMYYYY(
            assessment.nextEligibleDate
        )}`;
    }

    return reasonText;
};

const WAITING_PERIOD_REASONS =
    new Set([
        "WHOLE_BLOOD_COOLDOWN_ACTIVE",
        "WHOLE_BLOOD_ANNUAL_LIMIT_REACHED",

        "PLATELET_COOLDOWN_ACTIVE",
        "PLATELET_WEEKLY_LIMIT_REACHED",
        "PLATELET_ANNUAL_LIMIT_REACHED",

        "RECENT_WHOLE_BLOOD_DONATION",
        "PLASMA_COOLDOWN_ACTIVE",
    ]);

const MILLISECONDS_PER_DAY =
    24 * 60 * 60 * 1000;

export const getWaitingPeriodInformation = (assessment) => {
    const waitingReason =
        assessment?.reasons?.find((reason) =>
            WAITING_PERIOD_REASONS.has(reason)
        );

    if (!waitingReason || !assessment?.nextEligibleDate) {
        return {
            active: false,
            reason: null,
            remainingDays: 0,
            nextEligibleDate: null,
            formattedNextEligibleDate: null,
        };
    }

    const nextEligibleDate =
        new Date(assessment.nextEligibleDate);

    if (Number.isNaN(nextEligibleDate.getTime())) {
        return {
            active: false,
            reason: null,
            remainingDays: 0,
            nextEligibleDate: null,
            formattedNextEligibleDate: null,
        };
    }

    const difference = nextEligibleDate.getTime() - Date.now();

    if (difference <= 0) {
        return {
            active: false,
            reason: waitingReason,
            remainingDays: 0,
            nextEligibleDate,
            formattedNextEligibleDate: formatDateDDMMYYYY(nextEligibleDate),
        };
    }

    return {
        active: true,
        reason: waitingReason,

        remainingDays: Math.max(
            1,
            Math.ceil(
                difference /
                MILLISECONDS_PER_DAY
            )
        ),

        nextEligibleDate,

        formattedNextEligibleDate:
            formatDateDDMMYYYY(
                nextEligibleDate
            ),
    };
};