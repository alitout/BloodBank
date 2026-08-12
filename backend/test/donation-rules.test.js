import test from "node:test";
import assert from "node:assert/strict";
import { assessDonorForRequest, } from "../services/donorEligibilityService.js";
import { isBloodTypeCompatible, } from "../services/bloodCompatibilityService.js";
import { evaluateDonationEligibility, } from "../services/donationEligibilityService.js";

const referenceDate = new Date(
    "2026-08-10T12:00:00.000Z"
);

const donor = {
    uid: "user-test",
    role: "donor",
    verifiedByAdmin: true,
    status: "eligible",
    bloodType: "O-",
    biologicalSex: "male",
    dateOfBirth: new Date(
        "1990-01-01T00:00:00.000Z"
    ),
};

const approvedDonation = (
    donationType,
    donationDate
) => ({
    status: "approved",
    donationType,
    donationDate: new Date(donationDate),
});

test("O- whole-blood donor can connect to AB+ request", () => {
    assert.equal(
        isBloodTypeCompatible({
            donorBloodType: "O-",
            recipientBloodType: "AB+",
            donationType: "whole_blood",
        }),
        true
    );
});

test("AB+ whole-blood donor cannot connect to O- request", () => {
    assert.equal(
        isBloodTypeCompatible({
            donorBloodType: "AB+",
            recipientBloodType: "O-",
            donationType: "whole_blood",
        }),
        false
    );
});

test("AB plasma is a preliminary match for O recipient", () => {
    assert.equal(
        isBloodTypeCompatible({
            donorBloodType: "AB+",
            recipientBloodType: "O-",
            donationType: "plasma",
        }),
        true
    );
});

test("unverified donor is blocked by the platform", () => {
    const result = evaluateDonationEligibility({
        donor: {
            ...donor,
            verifiedByAdmin: false,
        },
        donationType: "whole_blood",
        referenceDate,
    });

    assert.equal(result.eligible, false);
    assert.ok(
        result.reasons.includes(
            "ACCOUNT_NOT_VERIFIED"
        )
    );
});

test("donor younger than 18 is blocked", () => {
    const result = evaluateDonationEligibility({
        donor: {
            ...donor,
            dateOfBirth: new Date(
                "2010-01-01T00:00:00.000Z"
            ),
        },
        donationType: "whole_blood",
        referenceDate,
    });

    assert.equal(result.eligible, false);
    assert.ok(
        result.reasons.includes(
            "DONOR_AGE_OUT_OF_RANGE"
        )
    );
});

test("whole blood is blocked during 56-day interval", () => {
    const result = evaluateDonationEligibility({
        donor,
        donationType: "whole_blood",
        donations: [
            approvedDonation(
                "whole_blood",
                "2026-07-15T12:00:00.000Z"
            ),
        ],
        referenceDate,
    });

    assert.equal(result.eligible, false);
    assert.ok(
        result.reasons.includes(
            "WHOLE_BLOOD_COOLDOWN_ACTIVE"
        )
    );
});

test("platelets are blocked before 48 hours", () => {
    const result = evaluateDonationEligibility({
        donor,
        donationType: "platelets",
        donations: [
            approvedDonation(
                "platelets",
                "2026-08-09T12:00:00.000Z"
            ),
        ],
        referenceDate,
    });

    assert.equal(result.eligible, false);
    assert.ok(
        result.reasons.includes(
            "PLATELET_COOLDOWN_ACTIVE"
        )
    );
});

test("platform eligibility never removes hospital screening", () => {
    const result = evaluateDonationEligibility({
        donor,
        donationType: "whole_blood",
        donations: [],
        referenceDate,
    });

    assert.equal(result.eligible, true);
    assert.equal(
        result.hospitalScreeningRequired,
        true
    );
});

test("compatible verified donor can connect through the platform", () => {
    const assessment =
        assessDonorForRequest({
            donor,
            request: {
                bloodType: "AB+",
                bloodGenre: "whole_blood",
            },
            donations: [],
            referenceDate,
        });

    assert.equal(
        assessment.compatible,
        true
    );

    assert.equal(
        assessment.platformEligible,
        true
    );

    assert.equal(
        assessment.hospitalScreeningRequired,
        true
    );
});

test("incompatible donor cannot connect through the platform", () => {
    const assessment =
        assessDonorForRequest({
            donor: {
                ...donor,
                bloodType: "AB+",
            },
            request: {
                bloodType: "O-",
                bloodGenre: "whole_blood",
            },
            donations: [],
            referenceDate,
        });

    assert.equal(
        assessment.compatible,
        false
    );

    assert.equal(
        assessment.platformEligible,
        false
    );

    assert.ok(
        assessment.reasons.includes(
            "BLOOD_TYPE_NOT_COMPATIBLE"
        )
    );
});

test("compatible unverified donor may view but cannot connect", () => {
    const assessment =
        assessDonorForRequest({
            donor: {
                ...donor,
                bloodType: "O-",
                verifiedByAdmin: false,
            },
            request: {
                bloodType: "A+",
                bloodGenre: "whole_blood",
            },
            donations: [],
            referenceDate,
        });

    assert.equal(
        assessment.compatible,
        true
    );

    assert.equal(
        assessment.platformEligible,
        false
    );

    assert.ok(
        assessment.reasons.includes(
            "ACCOUNT_NOT_VERIFIED"
        )
    );
});

test("donor exactly 18 years old is accepted", () => {
    const result =
        evaluateDonationEligibility({
            donor: {
                ...donor,
                dateOfBirth:
                    new Date(
                        "2008-08-10T00:00:00.000Z"
                    ),
            },

            donationType:
                "whole_blood",

            donations: [],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        true
    );
});

test("donor older than 65 is rejected", () => {
    const result =
        evaluateDonationEligibility({
            donor: {
                ...donor,
                dateOfBirth:
                    new Date(
                        "1960-08-09T00:00:00.000Z"
                    ),
            },

            donationType:
                "whole_blood",

            donations: [],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        false
    );

    assert.ok(
        result.reasons.includes(
            "DONOR_AGE_OUT_OF_RANGE"
        )
    );
});

test("whole blood becomes available at exactly 56 days", () => {
    const result =
        evaluateDonationEligibility({
            donor,

            donationType:
                "whole_blood",

            donations: [
                approvedDonation(
                    "whole_blood",
                    "2026-06-15T12:00:00.000Z"
                ),
            ],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        true
    );
});

test("male donor is blocked after six whole-blood donations in rolling year", () => {
    const dates = [
        "2025-09-01T12:00:00.000Z",
        "2025-10-28T12:00:00.000Z",
        "2025-12-24T12:00:00.000Z",
        "2026-02-19T12:00:00.000Z",
        "2026-04-16T12:00:00.000Z",
        "2026-06-12T12:00:00.000Z",
    ];

    const result =
        evaluateDonationEligibility({
            donor: {
                ...donor,
                biologicalSex: "male",
            },

            donationType:
                "whole_blood",

            donations:
                dates.map((date) =>
                    approvedDonation(
                        "whole_blood",
                        date
                    )
                ),

            referenceDate,
        });

    assert.equal(
        result.eligible,
        false
    );

    assert.ok(
        result.reasons.includes(
            "WHOLE_BLOOD_ANNUAL_LIMIT_REACHED"
        )
    );
});

test("female donor is blocked after four whole-blood donations in rolling year", () => {
    const dates = [
        "2025-10-01T12:00:00.000Z",
        "2025-12-01T12:00:00.000Z",
        "2026-02-01T12:00:00.000Z",
        "2026-04-01T12:00:00.000Z",
    ];

    const result =
        evaluateDonationEligibility({
            donor: {
                ...donor,
                biologicalSex:
                    "female",
            },

            donationType:
                "whole_blood",

            donations:
                dates.map((date) =>
                    approvedDonation(
                        "whole_blood",
                        date
                    )
                ),

            referenceDate,
        });

    assert.equal(
        result.eligible,
        false
    );

    assert.ok(
        result.reasons.includes(
            "WHOLE_BLOOD_ANNUAL_LIMIT_REACHED"
        )
    );
});

test("third platelet donation inside rolling week is blocked", () => {
    const result =
        evaluateDonationEligibility({
            donor,

            donationType:
                "platelets",

            donations: [
                approvedDonation(
                    "platelets",
                    "2026-08-03T13:00:00.000Z"
                ),

                approvedDonation(
                    "platelets",
                    "2026-08-06T12:00:00.000Z"
                ),
            ],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        false
    );

    assert.ok(
        result.reasons.includes(
            "PLATELET_WEEKLY_LIMIT_REACHED"
        )
    );
});

test("plasma is blocked before 28 days", () => {
    const result =
        evaluateDonationEligibility({
            donor,

            donationType:
                "plasma",

            donations: [
                approvedDonation(
                    "plasma",
                    "2026-07-20T12:00:00.000Z"
                ),
            ],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        false
    );

    assert.ok(
        result.reasons.includes(
            "PLASMA_COOLDOWN_ACTIVE"
        )
    );
});

test("plasma becomes available at exactly 28 days", () => {
    const result =
        evaluateDonationEligibility({
            donor,

            donationType:
                "plasma",

            donations: [
                approvedDonation(
                    "plasma",
                    "2026-07-13T12:00:00.000Z"
                ),
            ],

            referenceDate,
        });

    assert.equal(
        result.eligible,
        true
    );
});