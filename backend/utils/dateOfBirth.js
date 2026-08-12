import {
    MINIMUM_DONOR_AGE,
    MAXIMUM_DONOR_AGE,
} from "../config/donationRules.js";

const parseDateOnly = (value) => {
    if (value instanceof Date) {
        const copiedDate = new Date(value);

        if (Number.isNaN(copiedDate.getTime())) {
            return null;
        }

        return copiedDate;
    }

    if (typeof value !== "string") {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const parsedDate = new Date(
        Date.UTC(year, month - 1, day)
    );

    /*
     * Prevent JavaScript from accepting invalid dates such
     * as 2025-02-31 and converting them into another month.
     */
    if (
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day
    ) {
        return null;
    }

    return parsedDate;
};

export const calculateAge = (
    dateOfBirth,
    referenceDate = new Date()
) => {
    const birthDate = parseDateOnly(dateOfBirth);

    if (!birthDate) {
        return null;
    }

    let age =
        referenceDate.getUTCFullYear() -
        birthDate.getUTCFullYear();

    const referenceMonth = referenceDate.getUTCMonth();
    const birthMonth = birthDate.getUTCMonth();

    if (
        referenceMonth < birthMonth ||
        (
            referenceMonth === birthMonth &&
            referenceDate.getUTCDate() <
            birthDate.getUTCDate()
        )
    ) {
        age -= 1;
    }

    return age;
};

export const validateDateOfBirth = (
    value,
    referenceDate = new Date()
) => {
    const parsedDate = parseDateOnly(value);

    if (!parsedDate) {
        return {
            valid: false,
            code: "INVALID_DATE_OF_BIRTH",
            error: "Date of birth must use the YYYY-MM-DD format",
        };
    }

    if (parsedDate > referenceDate) {
        return {
            valid: false,
            code: "DATE_OF_BIRTH_IN_FUTURE",
            error: "Date of birth cannot be in the future",
        };
    }

    const age = calculateAge(parsedDate, referenceDate);

    if (
        age < MINIMUM_DONOR_AGE ||
        age > MAXIMUM_DONOR_AGE
    ) {
        return {
            valid: false,
            code: "DONOR_AGE_OUT_OF_RANGE",
            error: `Donor must be between ${MINIMUM_DONOR_AGE} and ${MAXIMUM_DONOR_AGE} years old`,
            age,
        };
    }

    return {
        valid: true,
        date: parsedDate,
        age,
    };
};