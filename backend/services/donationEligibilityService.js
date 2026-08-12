import {
    DONATION_RULES,
    DONATION_TYPES,
    ROLLING_WEEK_MS,
    ROLLING_YEAR_MS,
} from "../config/donationRules.js";

import {
    calculateAge,
} from "../utils/dateOfBirth.js";

const asValidDate = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
};

const normalizeDonationType = (donationType) => {

    return donationType || DONATION_TYPES.WHOLE_BLOOD;
};

const getApprovedHistory = (donations) =>
    donations
        .filter(
            (donation) =>
                donation.status === "approved" &&
                asValidDate(donation.donationDate)
        )
        .map((donation) => ({
            donationType: normalizeDonationType(
                donation.donationType
            ),
            donationDate: asValidDate(
                donation.donationDate
            ),
        }))
        .sort(
            (first, second) =>
                first.donationDate - second.donationDate
        );

const laterDate = (currentDate, candidateDate) => {
    if (!candidateDate) {
        return currentDate;
    }

    if (!currentDate || candidateDate > currentDate) {
        return candidateDate;
    }

    return currentDate;
};

const addInterval = (date, intervalMs) =>
    new Date(date.getTime() + intervalMs);

export const evaluateDonationEligibility = ({
    donor,
    donationType,
    donations = [],
    referenceDate = new Date(),
}) => {
    const reasons = [];
    let nextEligibleDate = null;

    const addReason = (code, blockedUntil = null) => {
        if (!reasons.includes(code)) {
            reasons.push(code);
        }

        nextEligibleDate = laterDate(
            nextEligibleDate,
            blockedUntil
        );
    };

    if (!Object.values(DONATION_TYPES).includes(donationType)) {
        addReason("INVALID_DONATION_TYPE");
    }

    if (!donor || donor.role !== "donor") {
        addReason("DONOR_ACCOUNT_NOT_FOUND");
    }

    if (donor && !donor.verifiedByAdmin) {
        addReason("ACCOUNT_NOT_VERIFIED");
    }

    if (donor?.status === "deferred") {
        addReason("ACCOUNT_DEFERRED");
    }

    if (!donor?.dateOfBirth || !donor?.biologicalSex) {
        addReason("ELIGIBILITY_PROFILE_INCOMPLETE");
    }

    const age = donor?.dateOfBirth
        ? calculateAge(
            donor.dateOfBirth,
            referenceDate
        )
        : null;

    if (age !== null && (age < 18 || age > 65)) {
        addReason("DONOR_AGE_OUT_OF_RANGE");
    }

    const history = getApprovedHistory(donations);

    const rollingYearStart = new Date(
        referenceDate.getTime() - ROLLING_YEAR_MS
    );

    const rollingWeekStart = new Date(
        referenceDate.getTime() - ROLLING_WEEK_MS
    );

    const historyForType = history.filter(
        (donation) =>
            donation.donationType === donationType
    );

    const historyForTypeInYear = historyForType.filter(
        (donation) =>
            donation.donationDate > rollingYearStart
    );

    const latestForType =
        historyForType.at(-1) || null;

    if (
        donationType === DONATION_TYPES.WHOLE_BLOOD
    ) {
        const rules =
            DONATION_RULES[DONATION_TYPES.WHOLE_BLOOD];

        if (latestForType) {
            const intervalEnd = addInterval(
                latestForType.donationDate,
                rules.minimumIntervalMs
            );

            if (referenceDate < intervalEnd) {
                addReason(
                    "WHOLE_BLOOD_COOLDOWN_ACTIVE",
                    intervalEnd
                );
            }
        }

        const annualLimit =
            rules.maximumPerRollingYear[
            donor?.biologicalSex
            ];

        if (
            annualLimit &&
            historyForTypeInYear.length >= annualLimit
        ) {
            const annualLimitEnd = addInterval(
                historyForTypeInYear[0].donationDate,
                ROLLING_YEAR_MS
            );

            addReason(
                "WHOLE_BLOOD_ANNUAL_LIMIT_REACHED",
                annualLimitEnd
            );
        }
    }

    if (
        donationType === DONATION_TYPES.PLATELETS
    ) {
        const rules =
            DONATION_RULES[DONATION_TYPES.PLATELETS];

        if (latestForType) {
            const intervalEnd = addInterval(
                latestForType.donationDate,
                rules.minimumIntervalMs
            );

            if (referenceDate < intervalEnd) {
                addReason(
                    "PLATELET_COOLDOWN_ACTIVE",
                    intervalEnd
                );
            }
        }

        const plateletsInWeek =
            historyForType.filter(
                (donation) =>
                    donation.donationDate > rollingWeekStart
            );

        if (
            plateletsInWeek.length >=
            rules.maximumPerRollingWeek
        ) {
            addReason(
                "PLATELET_WEEKLY_LIMIT_REACHED",
                addInterval(
                    plateletsInWeek[0].donationDate,
                    ROLLING_WEEK_MS
                )
            );
        }

        if (
            historyForTypeInYear.length >=
            rules.maximumPerRollingYear
        ) {
            addReason(
                "PLATELET_ANNUAL_LIMIT_REACHED",
                addInterval(
                    historyForTypeInYear[0].donationDate,
                    ROLLING_YEAR_MS
                )
            );
        }

        const latestWholeBlood = history
            .filter(
                (donation) =>
                    donation.donationType ===
                    DONATION_TYPES.WHOLE_BLOOD
            )
            .at(-1);

        if (latestWholeBlood) {
            const wholeBloodBlockEnd = addInterval(
                latestWholeBlood.donationDate,
                rules.wholeBloodBlockingIntervalMs
            );

            if (referenceDate < wholeBloodBlockEnd) {
                addReason(
                    "RECENT_WHOLE_BLOOD_DONATION",
                    wholeBloodBlockEnd
                );
            }
        }
    }

    if (
        donationType === DONATION_TYPES.PLASMA
    ) {
        const rules =
            DONATION_RULES[DONATION_TYPES.PLASMA];

        if (latestForType) {
            const intervalEnd = addInterval(
                latestForType.donationDate,
                rules.minimumIntervalMs
            );

            if (referenceDate < intervalEnd) {
                addReason(
                    "PLASMA_COOLDOWN_ACTIVE",
                    intervalEnd
                );
            }
        }
    }

    return {
        eligible: reasons.length === 0,
        reasons,
        nextEligibleDate:
            nextEligibleDate?.toISOString() || null,
        age,
        counts: {
            wholeBloodRollingYear: history.filter(
                (donation) =>
                    donation.donationType ===
                    DONATION_TYPES.WHOLE_BLOOD &&
                    donation.donationDate > rollingYearStart
            ).length,

            plateletsRollingWeek: history.filter(
                (donation) =>
                    donation.donationType ===
                    DONATION_TYPES.PLATELETS &&
                    donation.donationDate > rollingWeekStart
            ).length,

            plateletsRollingYear: history.filter(
                (donation) =>
                    donation.donationType ===
                    DONATION_TYPES.PLATELETS &&
                    donation.donationDate > rollingYearStart
            ).length,
        },

        hospitalScreeningRequired: true,
    };
};