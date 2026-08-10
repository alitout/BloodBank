import express from 'express';
import RequestController from '../../Controllers/Request/requestController.js';
import { verifyAccessToken, verifyAdminToken, verifyDonorToken, verifyDonorOrAdminToken, verifyVerifiedDonorToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyAccessToken, RequestController.getAllRequesters);
router.post('/', verifyAccessToken, RequestController.createRequester);

router.get('/available-requests', verifyDonorToken, RequestController.getAvailableRequests);
router.get('/assigned-requests', verifyDonorToken, RequestController.getAssignedRequests);
router.get('/donation-history', verifyDonorToken, RequestController.getDonationHistory);
router.get('/notifications', verifyDonorToken, RequestController.getDonorNotifications);
router.patch('/notifications/:notificationId/read', verifyDonorToken, RequestController.markNotificationAsRead);

router.get('/all-donations', verifyAdminToken, RequestController.getAllDonations);
router.get('/:id', verifyDonorOrAdminToken, RequestController.getRequesterById);
router.patch('/:id', verifyAccessToken, RequestController.updateRequester);
router.patch('/:id/assign', verifyAdminToken, RequestController.assignRequestToDonor);
router.post('/:id/match-donors', verifyAdminToken, RequestController.matchAndNotifyDonors);
router.post('/:id/assign-self', verifyVerifiedDonorToken, RequestController.assignSelfToRequest);
router.patch('/:id/cancel-assignment', verifyVerifiedDonorToken, RequestController.cancelAssignment);
router.delete('/:id', verifyAccessToken, RequestController.deleteRequester);

router.get('/my-requests', verifyAccessToken, RequestController.getMyRequests);

export default router;
