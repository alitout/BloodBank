import mongoose from "mongoose";
import Hospital from "../models/Hospital.js";

const REGISTERED_HOSPITAL =
    "registered";

const OTHER_HOSPITAL =
    "other";

const ALLOWED_SELECTION_TYPES =
    new Set([
        REGISTERED_HOSPITAL,
        OTHER_HOSPITAL,
    ]);

export class RequestHospitalValidationError
    extends Error {
    constructor(
        message,
        code =
            "INVALID_HOSPITAL_SELECTION"
    ) {
        super(message);

        this.name =
            "RequestHospitalValidationError";

        this.statusCode = 400;
        this.code = code;
    }
}

const normalizeText = (
    value,
    {
        fieldName,
        minimumLength = 2,
        maximumLength,
    }
) => {
    if (
        typeof value !== "string"
    ) {
        throw new RequestHospitalValidationError(
            `${fieldName} is required.`
        );
    }

    const normalized =
        value
            .normalize("NFKC")
            .trim()
            .replace(/\s+/g, " ");

    if (
        normalized.length <
        minimumLength
    ) {
        throw new RequestHospitalValidationError(
            `${fieldName} must contain at least ${minimumLength} characters.`
        );
    }

    if (
        normalized.length >
        maximumLength
    ) {
        throw new RequestHospitalValidationError(
            `${fieldName} cannot exceed ${maximumLength} characters.`
        );
    }

    if (
        /[\u0000-\u001F\u007F]/.test(
            normalized
        )
    ) {
        throw new RequestHospitalValidationError(
            `${fieldName} contains invalid characters.`
        );
    }

    return normalized;
};

const findRegisteredHospital =
    async ({
        hospitalId,
        legacyHospitalName,
    }) => {
        const normalizedIdentifier =
            typeof hospitalId === "string"
                ? hospitalId.trim()
                : "";

        if (normalizedIdentifier) {
            const identifierConditions = [
                {
                    id:
                        normalizedIdentifier,
                },
            ];

            if (
                mongoose.Types.ObjectId.isValid(
                    normalizedIdentifier
                )
            ) {
                identifierConditions.push({
                    _id:
                        normalizedIdentifier,
                });
            }

            return Hospital.findOne({
                $or:
                    identifierConditions,
            });
        }

        if (
            typeof legacyHospitalName ===
            "string" &&
            legacyHospitalName.trim()
        ) {
            const normalizedName =
                normalizeText(
                    legacyHospitalName,
                    {
                        fieldName:
                            "Hospital name",
                        minimumLength: 2,
                        maximumLength: 150,
                    }
                );

            return Hospital.findOne({
                name:
                    normalizedName,
            }).collation({
                locale: "en",
                strength: 2,
            });
        }

        return null;
    };

export const resolveRequestHospital =
    async ({
        hospitalSelectionType,
        hospitalId,
        hospital,
        customHospital,
    }) => {

        const selectionType =
            hospitalSelectionType ||
            (customHospital
                ? OTHER_HOSPITAL
                : REGISTERED_HOSPITAL);

        if (
            !ALLOWED_SELECTION_TYPES.has(
                selectionType
            )
        ) {
            throw new RequestHospitalValidationError(
                "Hospital selection type must be registered or other."
            );
        }

        if (
            selectionType ===
            REGISTERED_HOSPITAL
        ) {
            const registeredHospital =
                await findRegisteredHospital({
                    hospitalId,
                    legacyHospitalName:
                        hospital,
                });

            if (!registeredHospital) {
                throw new RequestHospitalValidationError(
                    "The selected hospital does not exist.",
                    "HOSPITAL_NOT_FOUND"
                );
            }

            return {
                hospitalSelectionType:
                    REGISTERED_HOSPITAL,

                hospitalId:
                    registeredHospital._id,

                hospital:
                    registeredHospital.name,

                customHospital: null,
            };
        }

        const customName =
            normalizeText(
                customHospital?.name,
                {
                    fieldName:
                        "Hospital name",
                    minimumLength: 2,
                    maximumLength: 150,
                }
            );

        const customAddress =
            normalizeText(
                customHospital?.address,
                {
                    fieldName:
                        "Hospital address",
                    minimumLength: 5,
                    maximumLength: 300,
                }
            );


        return {
            hospitalSelectionType:
                OTHER_HOSPITAL,

            hospitalId: null,

            hospital:
                customName,

            customHospital: {
                name:
                    customName,

                address:
                    customAddress,
            },
        };
    };