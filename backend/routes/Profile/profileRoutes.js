import express from 'express';
import ProfileController from '../../Controllers/Profile/profileController.js';
import { verifyAccessToken, verifyAdminToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Donor routes - require authentication
router.post('/profile/update', verifyAccessToken, ProfileController.requestProfileUpdate);
router.post('/profile/delete-request', verifyAccessToken, ProfileController.requestAccountDeletion);

// Admin routes - require admin authentication
router.get('/profile-requests', verifyAdminToken, ProfileController.getProfileRequests);
router.patch('/profile-requests/:id', verifyAdminToken, ProfileController.updateProfileRequest);

export default router;
