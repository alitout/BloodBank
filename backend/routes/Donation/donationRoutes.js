import express from 'express';

import DonationController from '../../Controllers/Donation/donationController.js';

import {
  verifyAccessToken,
  verifyAdminToken,
  verifyVerifiedDonorOrAdmin,
} from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get donor's donation history
router.get(
  '/myDonations',
  verifyVerifiedDonorOrAdmin,
  DonationController.getMyDonations
);

router.post(
  '/request/:requestId',
  verifyVerifiedDonorOrAdmin,
  DonationController.createDonation
);


router.patch(
  '/:donationId/complete',
  verifyVerifiedDonorOrAdmin,
  DonationController.donorCompleteDonation
);

// Get donations waiting for approval
router.get(
  '/admin/pending',
  verifyAdminToken,
  DonationController.getPendingDonations
);


// Get all donations
router.get(
  '/admin/all',
  verifyAdminToken,
  DonationController.getAllDonations
);


// Approve donation
router.patch(
  '/admin/:donationId/approve',
  verifyAdminToken,
  DonationController.approveDonation
);


// Reject donation
router.patch(
  '/admin/:donationId/reject',
  verifyAdminToken,
  DonationController.rejectDonation
);


export default router;