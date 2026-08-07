import express from 'express';
import UserController from '../../Controllers/User/userController.js';
import { verifyAccessToken, verifyAdminToken } from '../../middleware/authMiddleware.js';
import { authLimiter } from '../../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, UserController.registerDonor);
router.post('/login', authLimiter, UserController.loginUser);
router.post('/refresh-token', authLimiter, UserController.refreshAccessToken);
router.get('/me', verifyAccessToken, UserController.getCurrentUser);


router.post('/logout', verifyAccessToken, UserController.logoutUser);

// User management
router.get('/admin/accounts', verifyAdminToken, UserController.getAllAccounts);
router.get('/admin/pending', verifyAdminToken, UserController.getPendingUsers);
router.patch('/admin/verify/:uid', verifyAdminToken, UserController.verifyDonor);
router.patch('/admin/users/:uid', verifyAdminToken, UserController.updateUserByAdmin);
router.delete('/admin/delete/:uid', verifyAdminToken, UserController.deleteUserByAdmin);

// Admin creation routes
router.post('/admin/create-donor', verifyAdminToken, UserController.createDonorByAdmin);
router.post('/admin/create-super-admin', verifyAdminToken, UserController.createSuperAdminByAdmin);
router.post('/admin/create-hospital', verifyAdminToken, UserController.createHospitalByAdmin);

export default router;
