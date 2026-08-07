import express from 'express';
import RequestController from '../../Controllers/Request/requestController.js';
import { verifyAdminToken, verifyAccessToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Literal string routes MUST come before parameterized routes (:id)
router.get('/', verifyAccessToken, RequestController.getAllRequesters);
router.post('/', verifyAccessToken, RequestController.createRequester);

// Donor-specific routes for notifications and available requests
router.get('/available-requests', verifyAccessToken, RequestController.getAvailableRequests);
router.get('/assigned-requests', verifyAccessToken, RequestController.getAssignedRequests);
router.get('/donation-history', verifyAccessToken, RequestController.getDonationHistory);
router.get('/all-donations', verifyAdminToken, RequestController.getAllDonations);
router.get('/notifications', verifyAccessToken, RequestController.getDonorNotifications);
router.patch('/notifications/:notificationId/read', verifyAccessToken, RequestController.markNotificationAsRead);

// Parameterized routes with :id (must come AFTER literal string routes)
router.get('/:id', verifyAccessToken, RequestController.getRequesterById);
router.patch('/:id', verifyAccessToken, RequestController.updateRequester);
router.patch('/:id/assign', verifyAdminToken, RequestController.assignRequestToDonor);
// router.patch('/:id/complete-donation', verifyAccessToken, RequestController.completeDonation);
router.patch('/:id/cancel-assignment', verifyAccessToken, RequestController.cancelAssignment);
router.post('/:id/match-donors', verifyAdminToken, RequestController.matchAndNotifyDonors);
router.post('/:id/assign-self', verifyAccessToken, RequestController.assignSelfToRequest);
router.delete('/:id', verifyAccessToken, RequestController.deleteRequester);

export default router;
