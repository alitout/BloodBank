import Donation from "../../models/Donation.js";
import Request from "../../models/Requests.js";
import User from "../../models/User.js";
import { Notification } from "../../models/Notification.js";
import { buildEligibilitySummary, getApprovedDonationHistory } from "../../services/donorEligibilityService.js";

const generateDonationId = () =>
    `donation - ${Date.now()} -${Math.random()
        .toString(36)
        .substring(2, 8)
    } `;

const createHttpError = (
    statusCode,
    message
) => {
    const error = new Error(message);
    error.statusCode = statusCode;

    return error;
};

/*
 * Create a donation record for an assigned donor.
 */
const createDonation = async (
    req,
    res
) => {
    try {
        const donorUid =
            req.user?.uid;

        const { requestId } =
            req.params;

        if (!donorUid) {
            return res.status(401).json({
                error:
                    "Authentication required",
            });
        }

        if (!requestId) {
            return res.status(400).json({
                error:
                    "Request ID is required",
            });
        }

        const donor =
            await User.findOne({
                uid: donorUid,
                role: "donor",
            });

        if (!donor) {
            return res.status(404).json({
                error: "Donor not found",
            });
        }

        if (!donor.verifiedByAdmin) {
            return res.status(403).json({
                error:
                    "Account pending admin verification",
                code:
                    "ACCOUNT_NOT_VERIFIED",
                verificationPending: true,
            });
        }

        const request =
            await Request.findById(
                requestId
            );

        if (!request) {
            return res.status(404).json({
                error:
                    "Blood request not found",
            });
        }

        if (
            request.status !== "pending"
        ) {
            return res.status(400).json({
                error:
                    "This blood request is no longer active",
            });
        }

        const donorAssignment =
            request.assignedDonors?.find(
                (assignment) =>
                    assignment.donorUid ===
                    donorUid
            );

        if (!donorAssignment) {
            return res.status(403).json({
                error:
                    "You are not assigned to this blood request",
            });
        }

        if (
            (donorAssignment.unitsCompleted ||
                0) >=
            (donorAssignment.unitsAssigned ||
                0)
        ) {
            return res.status(409).json({
                error:
                    "This assignment is already completed",
            });
        }

        const existingDonation =
            await Donation.findOne({
                donorUid,
                requestId:
                    request._id,
            });

        if (existingDonation) {

            if (
                [
                    "rejected",
                    "cancelled",
                ].includes(
                    existingDonation.status
                )
            ) {
                existingDonation.status = "pending_confirmation";
                existingDonation.unitsAssigned = donorAssignment.unitsAssigned;
                existingDonation.unitsCompleted = 0;
                existingDonation.rejectionReason = null;
                existingDonation.rejectedAt = null;
                existingDonation.rejectedBy = null;
                existingDonation.donorCompletedAt = null;
                existingDonation.adminApprovedAt = null;
                existingDonation.adminApprovedBy = null;
                existingDonation.donationDate = null;
                existingDonation.updatedAt = new Date();
                existingDonation.donationType = request.bloodGenre;
                await existingDonation.save();

                return res.json({
                    message: "Donation record reopened",
                    donation: existingDonation,
                });
            }

            return res.status(409).json({
                error: "Donation record already exists",
                donation: existingDonation,
            });
        }

        const donation =
            await Donation.create({
                donationId: generateDonationId(),
                donorUid,
                requestId: request._id,
                donationType: request.bloodGenre,
                unitsAssigned: donorAssignment.unitsAssigned,
                unitsCompleted: 0,
                status: "pending_confirmation",
            });

        res.status(201).json({
            message: "Donation record created successfully",
            donation,
        });
    } catch (error) {
        console.error(
            "[DONATION] Create error:",
            error
        );

        res.status(500).json({
            error: "Failed to create donation record",
        });
    }
};

/*
 * Donor confirms that the donation took place.
 * The donation is not counted until admin approval.
 */
const donorCompleteDonation =
    async (req, res) => {
        try {
            const donorUid =
                req.user?.uid;

            const { donationId } =
                req.params;

            if (!donorUid) {
                return res
                    .status(401)
                    .json({
                        error:
                            "Authentication required",
                    });
            }

            if (!donationId) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Donation ID is required",
                    });
            }

            const donation =
                await Donation.findOne({
                    donationId,
                    donorUid,
                });

            if (!donation) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Donation record not found",
                    });
            }

            if (
                donation.status ===
                "approved"
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "This donation has already been approved",
                        donation,
                    });
            }

            if (
                donation.status ===
                "pending_admin_approval"
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "This donation is already waiting for admin approval",
                        donation,
                    });
            }

            if (
                donation.status ===
                "cancelled"
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "This donation has been cancelled",
                    });
            }

            if (
                ![
                    "pending_confirmation",
                    "rejected",
                ].includes(
                    donation.status
                )
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "This donation cannot be submitted for approval",
                    });
            }

            const donor =
                await User.findOne({
                    uid: donorUid,
                    role: "donor",
                });

            if (!donor) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Donor not found",
                    });
            }

            if (
                !donor.verifiedByAdmin
            ) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Account pending admin verification",
                        code:
                            "ACCOUNT_NOT_VERIFIED",
                    });
            }

            const request =
                await Request.findById(
                    donation.requestId
                );

            if (!request) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Blood request not found",
                    });
            }

            const donorAssignment =
                request.assignedDonors?.find(
                    (assignment) =>
                        assignment.donorUid ===
                        donorUid
                );

            if (!donorAssignment) {
                return res
                    .status(403)
                    .json({
                        error:
                            "Donor assignment no longer exists",
                    });
            }

            if (
                (donorAssignment.unitsCompleted ||
                    0) > 0
            ) {
                return res
                    .status(409)
                    .json({
                        error:
                            "This assignment is already completed",
                    });
            }

            const confirmedAt =
                new Date();

            donation.rejectionReason =
                null;

            donation.rejectedAt =
                null;

            donation.rejectedBy =
                null;

            donation.donorCompletedAt =
                confirmedAt;

            donation.unitsAssigned =
                donorAssignment.unitsAssigned;

            donation.unitsCompleted =
                donorAssignment.unitsAssigned;

            donation.status =
                "pending_admin_approval";

            donation.updatedAt =
                confirmedAt;

            await donation.save();

            /*
             * Remove older unresolved notifications
             * before creating fresh ones.
             */
            await Notification.deleteMany({
                type:
                    "donation_pending_approval",

                donationId:
                    donation.donationId,

                actionTaken: false,
            });

            const admins =
                await User.find({
                    role: "super_admin",
                }).select("uid");

            if (admins.length > 0) {
                const notificationTime =
                    Date.now();

                const adminNotifications = admins.map((admin) => ({
                    adminId: admin.uid,

                    donorId: donorUid,

                    requestId:
                        donation.requestId,

                    donationId:
                        donation.donationId,

                    type:
                        "donation_pending_approval",

                    title:
                        "Donation Completion Requires Approval",

                    message:
                        `${donor.fname || ""} ${donor.lname || ""}`.trim() +
                        ` confirmed ${donation.unitsCompleted} unit(s). ` +
                        "Approve or reject this completion.",

                    read: false,

                    actionTaken: false,

                    action: null,

                    createdAt: confirmedAt,
                }));

                await Notification.insertMany(
                    adminNotifications
                );
            }

            console.log(
                `[DONATION] Donor ${donorUid} submitted ${donationId} for admin approval`
            );

            res.json({
                message:
                    "Donation submitted for admin approval",
                donation,
            });
        } catch (error) {
            console.error(
                "[DONATION] Completion submission error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to submit donation completion",
            });
        }
    };

/*
 * Admin retrieves donations awaiting approval.
 */
const getPendingDonations =
    async (req, res) => {
        try {
            const donations =
                await Donation.find({
                    status:
                        "pending_admin_approval",
                })
                    .populate(
                        "requestId",
                        "id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status date description"
                    )
                    .sort({
                        donorCompletedAt: 1,
                    })
                    .lean();

            const donorUids = [
                ...new Set(
                    donations.map(
                        (donation) =>
                            donation.donorUid
                    )
                ),
            ];

            const donors =
                await User.find({
                    uid: {
                        $in: donorUids,
                    },
                })
                    .select(
                        "uid fname lname email phone bloodType status"
                    )
                    .lean();

            const donorMap =
                new Map(
                    donors.map((donor) => [
                        donor.uid,
                        donor,
                    ])
                );

            const result =
                donations.map(
                    (donation) => ({
                        ...donation,
                        donor:
                            donorMap.get(
                                donation.donorUid
                            ) || null,
                    })
                );

            res.json(result);
        } catch (error) {
            console.error(
                "[DONATION] Pending donations error:",
                error
            );

            res.status(500).json({
                error:
                    "Failed to fetch pending donations",
            });
        }
    };

/*
 * Admin approves a donation confirmation.
 */
const approveDonation = async (req, res) => {
    const session =
        await Donation.startSession();

    try {
        const adminUid = req.user?.uid;
        const { donationId } = req.params;

        if (!adminUid) {
            return res.status(401).json({
                error: "Authentication required",
            });
        }
        if (!donationId) {
            return res.status(400).json({
                error: "Donation ID is required",
            });
        }

        let responseData;

        await session.withTransaction(
            async () => {
                const donation =
                    await Donation.findOne({
                        donationId,
                    }).session(session);

                if (!donation) {
                    throw createHttpError(
                        404,
                        "Donation not found"
                    );
                }

                if (
                    donation.status === "approved"
                ) {
                    throw createHttpError(
                        409,
                        "This donation has already been approved"
                    );
                }

                if (
                    donation.status !== "pending_admin_approval"
                ) {
                    throw createHttpError(
                        400,
                        "Only donations pending admin approval can be approved"
                    );
                }

                const donor =
                    await User.findOne({
                        uid: donation.donorUid,
                        role: "donor",
                    }).session(session);

                if (!donor) {
                    throw createHttpError(
                        404,
                        "Donor not found"
                    );
                }

                const request =
                    await Request.findById(
                        donation.requestId
                    ).session(session);

                if (!request) {
                    throw createHttpError(
                        404,
                        "Blood request not found"
                    );
                }

                const donorAssignment =
                    request.assignedDonors?.find(
                        (assignment) =>
                            assignment.donorUid ===
                            donation.donorUid
                    );

                if (!donorAssignment) {
                    throw createHttpError(
                        400,
                        "Donor assignment no longer exists"
                    );
                }

                if (
                    (donorAssignment.unitsCompleted ||
                        0) > 0
                ) {
                    throw createHttpError(
                        409,
                        "This assignment is already completed"
                    );
                }

                const approvedAt = new Date();
                donation.status = "approved";
                donation.adminApprovedAt = approvedAt;
                donation.adminApprovedBy = adminUid;
                donation.donationDate = approvedAt;
                donation.updatedAt = approvedAt;
                donation.donationType = donation.donationType || request.bloodGenre;
                await donation.save({
                    session,
                });

                donorAssignment.unitsCompleted =
                    donation.unitsCompleted;

                donorAssignment.completedAt =
                    approvedAt;

                const totalCompleted =
                    request.assignedDonors.reduce(
                        (total, assignment) =>
                            total +
                            Number(
                                assignment.unitsCompleted ||
                                0
                            ),
                        0
                    );

                if (
                    totalCompleted >=
                    request.unitsNeeded
                ) {
                    request.status =
                        "fulfilled";
                } else {
                    request.status =
                        "pending";
                }

                request.updatedAt =
                    approvedAt;

                await request.save({
                    session,
                });

                const approvedDonationCount =
                    await Donation.countDocuments({
                        donorUid: donor.uid,
                        status: "approved",
                    }).session(session);

                const approvedHistory =
                    await getApprovedDonationHistory(
                        donor.uid,
                        {
                            session,
                        }
                    );

                const eligibilityByType =
                    buildEligibilitySummary({
                        donor,
                        donations:
                            approvedHistory,
                        referenceDate:
                            approvedAt,
                    });

                const wholeBloodEligibility =
                    eligibilityByType.whole_blood;

                donor.donationCount =
                    approvedDonationCount;

                donor.lastDonationDate =
                    approvedAt;

                if (donor.status !== "deferred") {
                    donor.status =
                        wholeBloodEligibility.eligible
                            ? "eligible"
                            : "cool-down";
                }

                donor.nextEligibleDate =
                    wholeBloodEligibility
                        .nextEligibleDate
                        ? new Date(
                            wholeBloodEligibility
                                .nextEligibleDate
                        )
                        : null;

                donor.updatedAt =
                    approvedAt;

                await donor.save({
                    session,
                });

                console.log(
                    "[DONATION] Cooldown saved:",
                    {
                        donorUid: donor.uid,
                        status: donor.status,
                        lastDonationDate:
                            donor.lastDonationDate,
                        nextEligibleDate:
                            donor.nextEligibleDate,
                        approvedAt,
                        daysDifference:
                            Math.ceil(
                                (
                                    donor.nextEligibleDate.getTime() -
                                    approvedAt.getTime()
                                ) /
                                (24 * 60 * 60 * 1000)
                            ),
                    }
                );

                await Notification.updateMany(
                    {
                        type:
                            "donation_pending_approval",
                        donationId,
                    },
                    {
                        $set: {
                            read: true,
                            readAt:
                                approvedAt,
                            actionTaken:
                                true,
                            action:
                                "approved",
                        },
                    },
                    {
                        session,
                    }
                );

                await Notification.create(
                    [
                        {
                            donorId: donation.donorUid,

                            requestId: donation.requestId,

                            donationId,

                            type: "donation_approved",

                            title: "Donation Record Confirmed",

                            message:
                                `Your donation record for ${request.bloodGenre} was confirmed. ` +
                                `Your platform eligibility has been recalculated. `,

                            read: false,

                            actionTaken: false,

                            action: null,

                            createdAt: approvedAt,
                        },
                    ],
                    {
                        session,
                    }
                );

                responseData = {
                    donation,

                    donor: {
                        uid: donor.uid,
                        fname: donor.fname,
                        lname: donor.lname,
                        bloodType: donor.bloodType,
                        donationCount: donor.donationCount,
                        lastDonationDate: donor.lastDonationDate,
                        nextEligibleDate: donor.nextEligibleDate,
                        status: donor.status,
                        eligibilityByType,
                    },

                    request: {
                        id: request.id,
                        _id: request._id,
                        status: request.status,
                        unitsNeeded: request.unitsNeeded,
                        totalCompleted,
                    },
                };
            }
        );

        console.log(
            `[AUDIT] Admin ${adminUid} approved donation ${donationId} `
        );

        res.json({
            message:
                "Donation approved successfully",
            ...responseData,
        });
    } catch (error) {
        console.error(
            "[DONATION] Approval error:",
            error
        );

        res
            .status(
                error.statusCode || 500
            )
            .json({
                error:
                    error.statusCode
                        ? error.message
                        : "Failed to approve donation",
            });
    } finally {
        await session.endSession();
    }
};

/*
 * Admin rejects a donor's completion claim.
 */
const rejectDonation = async (
    req,
    res
) => {
    const session =
        await Donation.startSession();

    try {
        const adminUid =
            req.user?.uid;

        const { donationId } =
            req.params;

        const reason =
            req.body?.rejectionReason?.trim();

        if (!adminUid) {
            return res.status(401).json({
                error:
                    "Authentication required",
            });
        }

        if (!donationId) {
            return res.status(400).json({
                error:
                    "Donation ID is required",
            });
        }

        if (!reason) {
            return res.status(400).json({
                error:
                    "Rejection reason is required",
            });
        }

        if (reason.length > 500) {
            return res.status(400).json({
                error:
                    "Rejection reason must not exceed 500 characters",
            });
        }

        let responseDonation;

        await session.withTransaction(
            async () => {
                const donation =
                    await Donation.findOne({
                        donationId,
                    }).session(session);

                if (!donation) {
                    throw createHttpError(
                        404,
                        "Donation not found"
                    );
                }

                if (
                    donation.status !==
                    "pending_admin_approval"
                ) {
                    throw createHttpError(
                        400,
                        "Only pending donations can be rejected"
                    );
                }

                const request =
                    await Request.findById(
                        donation.requestId
                    ).session(session);

                if (!request) {
                    throw createHttpError(
                        404,
                        "Blood request not found"
                    );
                }

                const donorAssignment =
                    request.assignedDonors?.find(
                        (assignment) =>
                            assignment.donorUid ===
                            donation.donorUid
                    );

                if (!donorAssignment) {
                    throw createHttpError(
                        400,
                        "Donor assignment no longer exists"
                    );
                }

                const rejectedAt =
                    new Date();

                donation.status =
                    "rejected";

                donation.rejectionReason =
                    reason;

                donation.rejectedAt =
                    rejectedAt;

                donation.rejectedBy =
                    adminUid;

                donation.donorCompletedAt =
                    null;

                donation.unitsCompleted =
                    0;

                donation.updatedAt =
                    rejectedAt;

                await donation.save({
                    session,
                });

                donorAssignment.unitsCompleted =
                    0;

                donorAssignment.completedAt =
                    null;

                const totalCompleted =
                    request.assignedDonors.reduce(
                        (total, assignment) =>
                            total +
                            Number(
                                assignment.unitsCompleted ||
                                0
                            ),
                        0
                    );

                if (
                    totalCompleted <
                    request.unitsNeeded
                ) {
                    request.status =
                        "pending";
                }

                request.updatedAt =
                    rejectedAt;

                await request.save({
                    session,
                });

                /*
                 * Do not change donationCount.
                 * Do not cancel a cooldown from an older
                 * approved donation.
                 */
                const donor =
                    await User.findOne({
                        uid:
                            donation.donorUid,
                        role: "donor",
                    }).session(session);

                if (donor) {
                    const hasActiveCooldown =
                        donor.nextEligibleDate &&
                        new Date(
                            donor.nextEligibleDate
                        ) > rejectedAt;

                    if (!hasActiveCooldown) {
                        donor.status =
                            "eligible";

                        donor.nextEligibleDate =
                            null;

                        donor.updatedAt =
                            rejectedAt;

                        await donor.save({
                            session,
                        });
                    }
                }

                await Notification.updateMany(
                    {
                        type:
                            "donation_pending_approval",
                        donationId,
                    },
                    {
                        $set: {
                            read: true,
                            readAt:
                                rejectedAt,
                            actionTaken:
                                true,
                            action:
                                "rejected",
                        },
                    },
                    {
                        session,
                    }
                );

                await Notification.create(
                    [
                        {
                            donorId: donation.donorUid,

                            requestId: donation.requestId,

                            donationId,

                            type: "donation_rejected",

                            title: "Donation Completion Rejected",

                            message:
                                `Your donation completion was rejected. Reason: ${reason}. ` +
                                "The request is available again in your assigned requests.",

                            read: false,

                            actionTaken: false,

                            action: null,

                            createdAt: rejectedAt,
                        },
                    ],
                    {
                        session,
                    }
                );

                responseDonation =
                    donation;
            }
        );

        console.log(
            `[AUDIT] Admin ${adminUid} rejected donation ${donationId} `
        );

        res.json({
            message:
                "Donation completion rejected",
            donation:
                responseDonation,
        });
    } catch (error) {
        console.error(
            "[DONATION] Rejection error:",
            error
        );

        res
            .status(
                error.statusCode || 500
            )
            .json({
                error:
                    error.statusCode
                        ? error.message
                        : "Failed to reject donation",
            });
    } finally {
        await session.endSession();
    }
};

/*
 * Get donor's donation records.
 */
const getMyDonations = async (
    req,
    res
) => {
    try {
        const donorUid =
            req.user?.uid;

        if (!donorUid) {
            return res.status(401).json({
                error:
                    "Authentication required",
            });
        }

        const donations =
            await Donation.find({
                donorUid,
            })
                .populate(
                    "requestId",
                    "id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status date description"
                )
                .sort({
                    createdAt: -1,
                });

        const approvedDonations =
            donations.filter(
                (donation) =>
                    donation.status ===
                    "approved"
            );

        const totalUnits =
            approvedDonations.reduce(
                (total, donation) =>
                    total +
                    Number(
                        donation.unitsCompleted ||
                        0
                    ),
                0
            );

        res.json({
            history: donations,
            count: totalUnits,
            totalUnits,
            donationCount:
                totalUnits,
            approvedDonationRecords:
                approvedDonations.length,
        });
    } catch (error) {
        console.error(
            "[DONATION] History error:",
            error
        );

        res.status(500).json({
            error:
                "Failed to fetch donation history",
        });
    }
};

/*
 * Admin gets all donation records.
 */
const getAllDonations = async (
    req,
    res
) => {
    try {
        const donations =
            await Donation.find({})
                .populate(
                    "requestId",
                    "id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status date description"
                )
                .sort({
                    createdAt: -1,
                });

        res.json(donations);
    } catch (error) {
        console.error(
            "[DONATION] Get all error:",
            error
        );

        res.status(500).json({
            error:
                "Failed to fetch donations",
        });
    }
};

export default {
    createDonation,
    donorCompleteDonation,
    getPendingDonations,
    approveDonation,
    rejectDonation,
    getMyDonations,
    getAllDonations,
};
