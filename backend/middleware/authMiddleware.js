import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization header',
        code: 'INVALID_AUTH_HEADER',
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
    };

    next();

  } catch (error) {

    console.error('[AUTH ERROR]', {
      name: error.name,
      message: error.message,
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

export const requireDonorOrAdmin = (req, res, next) => {
  if (
    req.user.role !== 'donor' &&
    req.user.role !== 'super_admin'
  ) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  next();
};

export const requireVerifiedDonor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NO_USER',
      });
    }

    // Admins do not require donor verification
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Only donors are allowed
    if (req.user.role !== 'donor') {
      return res.status(403).json({
        error: 'Donor access required',
        code: 'DONOR_REQUIRED',
      });
    }

    // Get current user state from database
    const user = await User.findOne({
      uid: req.user.uid,
    }).select('uid role verifiedByAdmin');

    if (!user) {
      return res.status(401).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.verifiedByAdmin) {
      return res.status(403).json({
        error: 'Account pending admin verification',
        code: 'ACCOUNT_NOT_VERIFIED',
        verificationPending: true,
      });
    }

    next();

  } catch (error) {
    console.error(
      '[AUTH] Verification status check failed:',
      error.message
    );

    return res.status(500).json({
      error: 'Unable to verify account status',
      code: 'VERIFICATION_CHECK_FAILED',
    });
  }
};

export const verifyAccessToken = authenticate;

export const verifyAdminToken = [
  authenticate,
  requireAdmin,
];

export const verifyDonorOrAdminToken = [
  authenticate,
  requireDonorOrAdmin,
];

export const verifyVerifiedDonorOrAdmin = [
  authenticate,
  requireVerifiedDonor,
];