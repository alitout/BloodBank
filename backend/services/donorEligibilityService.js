import Donation from "../models/Donation.js";
import { DONATION_TYPES, } from "../config/donationRules.js";
import { evaluateDonationEligibility, } from "./donationEligibilityService.js";
import User from "../models/User.js";
import { isBloodTypeCompatible, getCompatibleDonorTypes } from "./bloodCompatibilityService.js";


export const getApprovedDonationHistory = async (
    donorUid,
    { session = null } = {}
) => {
    let query = Donation.find({
        donorUid,
        status: "approved",
        donationDate: {
            $ne: null,
        },
    })
        .select(
            "donorUid donationType donationDate status"
        )
        .sort({
            donationDate: 1,
        });

    if (session) {
        query = query.session(session);
    }

    return query.lean();
};

export const buildEligibilitySummary = ({
    donor,
    donations,
    referenceDate = new Date(),
}) => ({
    whole_blood: evaluateDonationEligibility({
        donor,
        donationType:
            DONATION_TYPES.WHOLE_BLOOD,
        donations,
        referenceDate,
    }),

    platelets: evaluateDonationEligibility({
        donor,
        donationType:
            DONATION_TYPES.PLATELETS,
        donations,
        referenceDate,
    }),

    plasma: evaluateDonationEligibility({
        donor,
        donationType:
            DONATION_TYPES.PLASMA,
        donations,
        referenceDate,
    }),
});

export const getDonorEligibilitySummary = async (
    donor,
    options = {}
) => {
    const donations =
        await getApprovedDonationHistory(
            donor.uid,
            options
        );

    return buildEligibilitySummary({
        donor,
        donations,
        referenceDate:
            options.referenceDate || new Date(),
    });
};

export const getApprovedDonationHistories =
    async (donorUids) => {
        if (
            !Array.isArray(donorUids) ||
            donorUids.length === 0
        ) {
            return new Map();
        }

        const donations = await Donation.find({
            donorUid: {
                $in: donorUids,
            },
            status: "approved",
            donationDate: {
                $ne: null,
            },
        })
            .select(
                "donorUid donationType donationDate status"
            )
            .sort({
                donationDate: 1,
            })
            .lean();

        const histories = new Map();

        for (const donorUid of donorUids) {
            histories.set(donorUid, []);
        }

        for (const donation of donations) {
            if (!histories.has(donation.donorUid)) {
                histories.set(donation.donorUid, []);
            }

            histories
                .get(donation.donorUid)
                .push(donation);
        }

        return histories;
    };

export const assessDonorForRequest = ({
    donor,
    request,
    donations = [],
    referenceDate = new Date(),
}) => {
    const compatible =
        isBloodTypeCompatible({
            donorBloodType: donor?.bloodType,
            recipientBloodType:
                request?.bloodType,
            donationType:
                request?.bloodGenre,
        });

    const eligibility =
        evaluateDonationEligibility({
            donor,
            donationType:
                request?.bloodGenre,
            donations,
            referenceDate,
        });

    const reasons = compatible
        ? [...eligibility.reasons]
        : [
            "BLOOD_TYPE_NOT_COMPATIBLE",
            ...eligibility.reasons,
        ];

    return {
        compatible,

        platformEligible:
            compatible && eligibility.eligible,

        reasons:
            [...new Set(reasons)],

        nextEligibleDate:
            eligibility.nextEligibleDate,

        age: eligibility.age,

        counts: eligibility.counts,

        hospitalScreeningRequired: true,
    };
};

export const findPlatformEligibleDonorsForRequest =
    async (request) => {
        const compatibleBloodTypes =
            getCompatibleDonorTypes({
                recipientBloodType:
                    request.bloodType,

                donationType:
                    request.bloodGenre,
            });

        if (compatibleBloodTypes.length === 0) {
            return [];
        }

        const candidates = await User.find({
            role: "donor",
            verifiedByAdmin: true,
            status: {
                $ne: "deferred",
            },
            bloodType: {
                $in: compatibleBloodTypes,
            },
        });

        const histories =
            await getApprovedDonationHistories(
                candidates.map((donor) => donor.uid)
            );

        return candidates.filter((donor) => {
            const assessment =
                assessDonorForRequest({
                    donor,
                    request,
                    donations:
                        histories.get(donor.uid) || [],
                });

            return assessment.platformEligible;
        });
    };