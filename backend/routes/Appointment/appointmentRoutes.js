import express from 'express';
import AppointmentController from '../../Controllers/Appointment/appointmentController.js';
import { verifyAccessToken, verifyAdminToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get all appointments (authenticated users)
router.get('/', verifyAccessToken, AppointmentController.getAllAppointments);

// Create appointment (admin only)
router.post('/', verifyAdminToken, AppointmentController.createAppointment);

// Update appointment (admin only)
router.patch('/:id', verifyAdminToken, AppointmentController.updateAppointment);

// Delete appointment (admin only)
router.delete('/:id', verifyAdminToken, AppointmentController.deleteAppointment);

export default router;
