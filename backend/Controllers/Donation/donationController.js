import Donation from '../../models/Donation.js';
import Request from '../../models/Requests.js';
import User from '../../models/User.js';
import { Notification } from '../../models/Notification.js';

const generateDonationId = () => {
    return `donation-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;
};

const createDonation = async (req, res) => {
    try {
        const donorUid = req.user?.uid;
        const { requestId } = req.params;

        if (!donorUid) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        if (!requestId) {
            return res.status(400).json({
                error: 'Request ID is required',
            });
        }

        // Find donor
        const donor = await User.findOne({
            uid: donorUid,
            role: 'donor',
        });

        if (!donor) {
            return res.status(404).json({
                error: 'Donor not found',
            });
        }

        // Donor must be verified
        if (!donor.verifiedByAdmin) {
            return res.status(403).json({
                error: 'Account pending admin verification',
                code: 'ACCOUNT_NOT_VERIFIED',
                verificationPending: true,
            });
        }

        // Find blood request
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({
                error: 'Blood request not found',
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                error: 'This blood request is no longer active',
            });
        }

        // Check donor assignment
        const donorAssignment = request.assignedDonors?.find(
            (assignment) => assignment.donorUid === donorUid
        );

        if (!donorAssignment) {
            return res.status(403).json({
                error: 'You are not assigned to this blood request',
            });
        }

        // Check if donation already exists
        const existingDonation = await Donation.findOne({
            donorUid,
            requestId: request._id,
        });

        if (existingDonation) {
            return res.status(409).json({
                error: 'Donation record already exists',
                donation: existingDonation,
            });
        }

        const donation = new Donation({
            donationId: generateDonationId(),
            donorUid,
            requestId: request._id,
            unitsAssigned: donorAssignment.unitsAssigned,
            unitsCompleted: 0,
            status: 'pending_confirmation',
        });

        await donation.save();

        res.status(201).json({
            message: 'Donation record created successfully',
            donation,
        });
    } catch (error) {
        console.error(
            '[DONATION] Create error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to create donation record',
        });
    }
};


const donorCompleteDonation = async (req, res) => {
    try {
        const donorUid = req.user?.uid;
        const { donationId } = req.params;

        if (!donorUid) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        const donation = await Donation.findOne({
            donationId,
            donorUid,
        });

        if (!donation) {
            return res.status(404).json({
                error: 'Donation record not found',
            });
        }

        if (donation.status === 'approved') {
            return res.status(400).json({
                error: 'This donation has already been approved',
            });
        }

        if (donation.status === 'pending_admin_approval') {
            return res.status(400).json({
                error: 'This donation is already waiting for admin approval',
            });
        }

        if (donation.status === 'cancelled') {
            return res.status(400).json({
                error: 'This donation has been cancelled',
            });
        }

        // Mark donor confirmation
        donation.donorCompletedAt = new Date();

        // Units are completed according to assignment
        donation.unitsCompleted = donation.unitsAssigned;

        // IMPORTANT:
        // Do not update User or Request yet.
        // Admin must approve first.
        donation.status = 'pending_admin_approval';

        await donation.save();

        // Get donor information
        const donor = await User.findOne({
            uid: donorUid,
        });

        console.log(
            `[DONATION] Donor ${donorUid} submitted completed donation ${donationId} for admin approval`
        );

        res.json({
            message:
                'Donation completion submitted successfully. Waiting for admin approval.',
            donation,
            donor: donor
                ? {
                    uid: donor.uid,
                    fname: donor.fname,
                    lname: donor.lname,
                }
                : null,
        });
    } catch (error) {
        console.error(
            '[DONATION] Complete error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to submit donation completion',
        });
    }
};


/**
 * Admin gets donations waiting for approval.
 */
const getPendingDonations = async (req, res) => {
    try {
        const donations = await Donation.find({
            status: 'pending_admin_approval',
        })
            .populate(
                'requestId',
                'id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status'
            )
            .sort({
                donorCompletedAt: 1,
            });

        // Attach donor data
        const result = await Promise.all(
            donations.map(async (donation) => {
                const donor = await User.findOne({
                    uid: donation.donorUid,
                }).select(
                    'uid fname lname email phone bloodType'
                );

                return {
                    ...donation.toObject(),
                    donor,
                };
            })
        );

        res.json(result);
    } catch (error) {
        console.error(
            '[DONATION] Pending donations error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to fetch pending donations',
        });
    }
};


const approveDonation = async (req, res) => {
    try {
        const adminUid = req.user?.uid;
        const { donationId } = req.params;

        if (!adminUid) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        const donation = await Donation.findOne({
            donationId,
        });

        if (!donation) {
            return res.status(404).json({
                error: 'Donation not found',
            });
        }

        if (donation.status !== 'pending_admin_approval') {
            return res.status(400).json({
                error:
                    'Only donations pending admin approval can be approved',
            });
        }

        // Find donor
        const donor = await User.findOne({
            uid: donation.donorUid,
            role: 'donor',
        });

        if (!donor) {
            return res.status(404).json({
                error: 'Donor not found',
            });
        }

        // Find request
        const request = await Request.findById(
            donation.requestId
        );

        if (!request) {
            return res.status(404).json({
                error: 'Blood request not found',
            });
        }

        // Find donor assignment
        const donorAssignment =
            request.assignedDonors?.find(
                (assignment) =>
                    assignment.donorUid === donation.donorUid
            );

        if (!donorAssignment) {
            return res.status(400).json({
                error:
                    'Donor assignment no longer exists for this request',
            });
        }

        donation.status = 'approved';

        donation.adminApprovedAt = new Date();

        donation.adminApprovedBy = adminUid;

        donation.donationDate = new Date();

        await donation.save();

        donor.donationCount =
            (donor.donationCount || 0) +
            donation.unitsCompleted;

        donor.lastDonationDate = new Date();

        donor.status = 'cool-down';

        donor.updatedAt = new Date();

        await donor.save();

        donorAssignment.unitsCompleted =
            donation.unitsCompleted;

        const totalCompleted =
            request.assignedDonors.reduce(
                (total, assignment) =>
                    total + (assignment.unitsCompleted || 0),
                0
            );

        if (
            totalCompleted >= request.unitsNeeded
        ) {
            request.status = 'fulfilled';
        }

        request.updatedAt = new Date();

        await request.save();


        console.log(
            `[AUDIT] Admin ${adminUid} approved donation ${donationId}`
        );


        res.json({
            message:
                'Donation approved and recorded successfully',

            donation,

            donor: {
                uid: donor.uid,
                fname: donor.fname,
                lname: donor.lname,
                bloodType: donor.bloodType,
                donationCount: donor.donationCount,
                lastDonationDate:
                    donor.lastDonationDate,
                status: donor.status,
            },

            request: {
                id: request.id,
                status: request.status,
                unitsNeeded: request.unitsNeeded,
                totalCompleted,
            },
        });
    } catch (error) {
        console.error(
            '[DONATION] Approval error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to approve donation',
        });
    }
};


// Admin rejects donor's completion claim.
const rejectDonation = async (req, res) => {
    try {
        const adminUid = req.user?.uid;
        const { donationId } = req.params;
        const { rejectionReason } = req.body;

        if (!adminUid) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        const donation = await Donation.findOne({
            donationId,
        });

        if (!donation) {
            return res.status(404).json({
                error: 'Donation not found',
            });
        }

        if (
            donation.status !==
            'pending_admin_approval'
        ) {
            return res.status(400).json({
                error:
                    'Only pending donations can be rejected',
            });
        }

        donation.status = 'rejected';

        donation.rejectionReason =
            rejectionReason ||
            'Donation completion was rejected by admin';

        donation.updatedAt = new Date();

        await donation.save();

        console.log(
            `[AUDIT] Admin ${adminUid} rejected donation ${donationId}`
        );

        res.json({
            message: 'Donation rejected successfully',
            donation,
        });
    } catch (error) {
        console.error(
            '[DONATION] Rejection error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to reject donation',
        });
    }
};



// Get donor's own donation history.

const getMyDonations = async (req, res) => {
    try {
        const donorUid = req.user?.uid;

        if (!donorUid) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        const donations = await Donation.find({
            donorUid,
        })
            .populate(
                'requestId',
                'id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status'
            )
            .sort({
                createdAt: -1,
            });

        res.json(donations);
    } catch (error) {
        console.error(
            '[DONATION] History error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to fetch donation history',
        });
    }
};


// Admin gets all donations.

const getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find({})
            .populate(
                'requestId',
                'id fname fatherName lname bloodType bloodGenre hospital unitsNeeded status'
            )
            .sort({
                createdAt: -1,
            });

        res.json(donations);
    } catch (error) {
        console.error(
            '[DONATION] Get all error:',
            error.message
        );

        res.status(500).json({
            error: 'Failed to fetch donations',
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