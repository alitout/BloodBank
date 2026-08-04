import express from 'express';
import AlertController from '../../Controllers/Alert/alertController.js';
import { verifyAccessToken, verifyAdminToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get all alerts (authenticated users)
router.get('/', verifyAccessToken, AlertController.getAllAlerts);

// Create alert (admin only)
router.post('/', verifyAdminToken, AlertController.createAlert);

// Update alert (admin only)
router.patch('/:id', verifyAdminToken, AlertController.updateAlert);

// Delete alert (admin only)
router.delete('/:id', verifyAdminToken, AlertController.deleteAlert);

export default router;
