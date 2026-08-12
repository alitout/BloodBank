import {
    BLOOD_TYPES,
    DONATION_TYPES,
} from "../config/donationRules.js";

const RED_CELL_RECIPIENTS_BY_DONOR = Object.freeze({
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
});

const PLASMA_RECIPIENT_ABO_BY_DONOR_ABO = Object.freeze({
    O: ["O"],
    A: ["A", "O"],
    B: ["B", "O"],
    AB: ["AB", "A", "B", "O"],
});

const getAboGroup = (bloodType) =>
    bloodType?.replace(/[+-]$/, "") || null;

export const isValidBloodType = (bloodType) =>
    BLOOD_TYPES.includes(bloodType);

export const isBloodTypeCompatible = ({
    donorBloodType,
    recipientBloodType,
    donationType,
}) => {
    if (
        !isValidBloodType(donorBloodType) ||
        !isValidBloodType(recipientBloodType)
    ) {
        return false;
    }

    if (
        donationType === DONATION_TYPES.WHOLE_BLOOD
    ) {
        return RED_CELL_RECIPIENTS_BY_DONOR[
            donorBloodType
        ].includes(recipientBloodType);
    }

    if (donationType === DONATION_TYPES.PLASMA) {
        const donorAbo = getAboGroup(donorBloodType);
        const recipientAbo = getAboGroup(recipientBloodType);

        return PLASMA_RECIPIENT_ABO_BY_DONOR_ABO[
            donorAbo
        ].includes(recipientAbo);
    }

    if (
        donationType === DONATION_TYPES.PLATELETS
    ) {
        return donorBloodType === recipientBloodType;
    }

    return false;
};

export const getCompatibleDonorTypes = ({
    recipientBloodType,
    donationType,
}) =>
    BLOOD_TYPES.filter((donorBloodType) =>
        isBloodTypeCompatible({
            donorBloodType,
            recipientBloodType,
            donationType,
        })
    );