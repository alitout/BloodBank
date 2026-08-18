import express from 'express';
import RequestController from '../../Controllers/Request/requestController.js';
import { verifyAccessToken, verifyAdminToken, verifyDonorToken, verifyDonorOrAdminToken, verifyVerifiedDonorToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyAccessToken, RequestController.getAllRequesters);
router.post('/', verifyVerifiedDonorToken, RequestController.createRequester);

router.get('/available-requests', verifyDonorToken, RequestController.getAvailableRequests);
router.get('/assigned-requests', verifyDonorToken, RequestController.getAssignedRequests);
router.get('/donation-history', verifyDonorToken, RequestController.getDonationHistory);
router.get('/notifications', verifyDonorToken, RequestController.getDonorNotifications);
router.patch('/notifications/:notificationId/read', verifyDonorToken, RequestController.markNotificationAsRead);

router.get('/all-donations', verifyAdminToken, RequestController.getAllDonations);
router.get("/admin/pending-approval", verifyAdminToken, RequestController.getPendingRequestApprovals);
router.patch("/admin/:id/approve", verifyAdminToken, RequestController.approveRequest);
router.patch("/admin/:id/reject", verifyAdminToken, RequestController.rejectRequest);
router.post("/admin/:id/register-custom-hospital", verifyAdminToken, RequestController.registerCustomHospital);
router.get('/my-requests', verifyDonorToken, RequestController.getMyRequests);
router.get('/:id', verifyDonorOrAdminToken, RequestController.getRequesterById);
router.patch("/:id", verifyAdminToken, RequestController.updateRequester);
router.delete("/:id", verifyAdminToken, RequestController.deleteRequester);
router.patch('/:id/assign', verifyAdminToken, RequestController.assignRequestToDonor);
router.post('/:id/assign-self', verifyVerifiedDonorToken, RequestController.assignSelfToRequest);
router.patch('/:id/cancel-assignment', verifyVerifiedDonorToken, RequestController.cancelAssignment);

export default router;
