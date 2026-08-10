import express from 'express';
import DonationController from '../../Controllers/Donation/donationController.js';
import { verifyAdminToken, verifyVerifiedDonorToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get donor's donation history
router.get('/myDonations', verifyVerifiedDonorToken, DonationController.getMyDonations);
router.post('/request/:requestId', verifyVerifiedDonorToken, DonationController.createDonation);
router.patch('/:donationId/complete', verifyVerifiedDonorToken, DonationController.donorCompleteDonation);
router.get('/admin/pending', verifyAdminToken, DonationController.getPendingDonations);
router.get('/admin/all', verifyAdminToken, DonationController.getAllDonations);
router.patch('/admin/:donationId/approve', verifyAdminToken, DonationController.approveDonation);
router.patch('/admin/:donationId/reject', verifyAdminToken, DonationController.rejectDonation);

export default router;