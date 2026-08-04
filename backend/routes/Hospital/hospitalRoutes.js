import express from 'express';
import HospitalController from '../../Controllers/Hospital/hospitalController.js';
import { verifyAccessToken, verifyAdminToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get(
  '/',
  verifyAccessToken,
  HospitalController.getAllHospitals
);

router.post(
  '/',
  verifyAdminToken,
  HospitalController.createHospital
);

router.patch(
  '/:id',
  verifyAdminToken,
  HospitalController.updateHospital
);

router.delete(
  '/:id',
  verifyAdminToken,
  HospitalController.deleteHospital
);

export default router;
