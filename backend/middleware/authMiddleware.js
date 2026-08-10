import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import User from '../models/User.js';

/**
 * Extract a Bearer token from the Authorization header.
 */
const extractBearerToken = (authorizationHeader) => {
  if (
    !authorizationHeader ||
    typeof authorizationHeader !== 'string'
  ) {
    return null;
  }

  const match =
    authorizationHeader.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return null;
  }

  const token =
    match[1].trim();

  return token || null;
};

/**
 * Authenticate an access token.
 *
 * Important:
 * - Validates the JWT.
 * - Confirms that the user still exists.
 * - Loads the current role from MongoDB.
 * - Does not trust the role/email stored in an old token.
 */
export const authenticate =
  async (req, res, next) => {
    try {
      const authorizationHeader =
        req.headers.authorization;

      if (!authorizationHeader) {
        return res.status(401).json({
          error:
            'Authentication required',
          code:
            'NO_TOKEN'
        });
      }

      const token =
        extractBearerToken(
          authorizationHeader
        );

      if (!token) {
        return res.status(401).json({
          error:
            'Invalid authorization header',
          code:
            'INVALID_AUTH_HEADER'
        });
      }

      const decoded =
        jwt.verify(
          token,
          env.JWT_SECRET,
          {
            algorithms: [
              'HS256'
            ]
          }
        );

      if (
        !decoded?.uid ||
        typeof decoded.uid !==
        'string'
      ) {
        return res.status(401).json({
          error:
            'Invalid authentication token',
          code:
            'INVALID_TOKEN_PAYLOAD'
        });
      }

      /*
       * Check the current database state.
       * This prevents deleted users from
       * continuing to use an old token.
       */
      const user =
        await User.findOne({
          uid: decoded.uid
        }).select(
          [
            'uid',
            'email',
            'role',
            'verifiedByAdmin',
            'status'
          ].join(' ')
        );

      if (!user) {
        return res.status(401).json({
          error:
            'User account not found',
          code:
            'USER_NOT_FOUND'
        });
      }

      /*
       * Only expose the fields controllers
       * need. Never attach the complete
       * Mongoose user document to req.user.
       */
      req.user = {
        uid: user.uid,
        email: user.email,
        role: user.role,
        verifiedByAdmin:
          Boolean(
            user.verifiedByAdmin
          ),
        status:
          user.status || null
      };

      return next();
    } catch (error) {
      if (
        error.name ===
        'TokenExpiredError'
      ) {
        return res.status(401).json({
          error:
            'Token expired',
          code:
            'TOKEN_EXPIRED'
        });
      }

      if (
        error.name ===
        'JsonWebTokenError' ||
        error.name ===
        'NotBeforeError'
      ) {
        return res.status(401).json({
          error:
            'Invalid authentication token',
          code:
            'INVALID_TOKEN'
        });
      }

      console.error(
        '[AUTH] Authentication failed:',
        error.message
      );

      return res.status(500).json({
        error:
          'Authentication service unavailable',
        code:
          'AUTH_SERVICE_ERROR'
      });
    }
  };

/**
 * Restrict a route to one or more roles.
 *
 * Example:
 * authorizeRoles('donor', 'super_admin')
 */
export const authorizeRoles =
  (...allowedRoles) =>
    (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error:
            'Authentication required',
          code:
            'NO_AUTHENTICATED_USER'
        });
      }

      if (
        !allowedRoles.includes(
          req.user.role
        )
      ) {
        return res.status(403).json({
          error:
            'Insufficient permissions',
          code:
            'INSUFFICIENT_PERMISSIONS'
        });
      }

      return next();
    };

/**
 * Require the authenticated donor to
 * be verified by an administrator.
 *
 * This middleware must run after:
 * - authenticate
 * - authorizeRoles('donor')
 */
export const requireVerifiedDonor =
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error:
          'Authentication required',
        code:
          'NO_AUTHENTICATED_USER'
      });
    }

    if (
      req.user.role !== 'donor'
    ) {
      return res.status(403).json({
        error:
          'Donor access required',
        code:
          'DONOR_REQUIRED'
      });
    }

    if (
      !req.user.verifiedByAdmin
    ) {
      return res.status(403).json({
        error:
          'Account pending admin verification',
        code:
          'ACCOUNT_NOT_VERIFIED',
        verificationPending:
          true
      });
    }

    return next();
  };

/*
 * General authenticated access.
 */
export const verifyAccessToken =
  authenticate;

/*
 * Super-admin-only access.
 */
export const verifyAdminToken = [
  authenticate,
  authorizeRoles(
    'super_admin'
  )
];

/*
 * Donor-only access.
 *
 * The donor may be unverified. Use this
 * for viewing requests and notifications.
 */
export const verifyDonorToken = [
  authenticate,
  authorizeRoles(
    'donor'
  )
];

/*
 * Donor or administrator access.
 *
 * This permits an unverified donor to view
 * a request while the Donate button remains
 * disabled by Phase 1.
 */
export const verifyDonorOrAdminToken = [
  authenticate,
  authorizeRoles(
    'donor',
    'super_admin'
  )
];

/*
 * Verified donor access.
 *
 * Use this for actions that change donation
 * state: assign, complete, confirm, etc.
 */
export const verifyVerifiedDonorToken = [
  authenticate,
  authorizeRoles(
    'donor'
  ),
  requireVerifiedDonor
];