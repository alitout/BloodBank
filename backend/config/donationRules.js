export const DONATION_TYPES = Object.freeze({
    WHOLE_BLOOD: "whole_blood",
    PLATELETS: "platelets",
    PLASMA: "plasma",
});

export const BLOOD_TYPES = Object.freeze([
    "O-",
    "O+",
    "A-",
    "A+",
    "B-",
    "B+",
    "AB-",
    "AB+",
]);

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DONATION_RULES = Object.freeze({
    whole_blood: {
        minimumIntervalMs: 56 * DAY_IN_MS,

        // Rolling 365-day limit
        maximumPerRollingYear: {
            male: 6,
            female: 4,
        },
    },

    platelets: {
        minimumIntervalMs: 2 * DAY_IN_MS, // 48 hours
        maximumPerRollingWeek: 2,
        maximumPerRollingYear: 24,

        // Conservative connection rule after whole-blood donation.
        wholeBloodBlockingIntervalMs: 56 * DAY_IN_MS,
    },

    plasma: {
        minimumIntervalMs: 28 * DAY_IN_MS,
    },
});

export const ROLLING_WEEK_MS = 7 * DAY_IN_MS;
export const ROLLING_YEAR_MS = 365 * DAY_IN_MS;

export const MINIMUM_DONOR_AGE = 18;
export const MAXIMUM_DONOR_AGE = 65;