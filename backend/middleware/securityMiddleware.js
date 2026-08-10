import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';
import cors from 'cors';
import { env } from '../config/env.js';

const rateLimitHandler = (
  req,
  res
) => {
  return res.status(429).json({
    error:
      'Too many requests. Please try again later.',
    code:
      'GENERAL_RATE_LIMIT_EXCEEDED'
  });
};

const authLimitHandler = (
  req,
  res
) => {
  return res.status(429).json({
    error:
      'Too many authentication attempts. Please try again later.',
    code:
      'AUTH_RATE_LIMIT_EXCEEDED'
  });
};

const strictLimitHandler = (
  req,
  res
) => {
  return res.status(429).json({
    error:
      'Too many sensitive operations. Please try again later.',
    code:
      'STRICT_RATE_LIMIT_EXCEEDED'
  });
};

/*
 * These routes have their own authLimiter,
 * so generalLimiter must not count them too.
 *
 * Use originalUrl because generalLimiter is
 * mounted at /api.
 */
const authLimitedPaths =
  new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh-token'
  ]);

export const generalLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    /*
     * A React application can easily make
     * more than 100 API calls because of
     * polling, dashboard loading and
     * notification refreshes.
     */
    max:
      env.NODE_ENV ===
        'production'
        ? 300
        : 2000,

    handler:
      rateLimitHandler,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    skip: (req) => {
      /*
       * Do not count CORS preflight.
       */
      if (
        req.method ===
        'OPTIONS'
      ) {
        return true;
      }

      const requestPath =
        req.originalUrl
          .split('?')[0]
          .replace(/\/+$/, '');

      /*
       * Login, registration and refresh
       * already use authLimiter.
       */
      return authLimitedPaths.has(
        requestPath
      );
    }
  });

export const authLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    /*
     * Development needs additional attempts
     * for repeated manual testing.
     */
    max:
      env.NODE_ENV ===
        'production'
        ? 10
        : 100,

    handler:
      authLimitHandler,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    /*
     * Only unsuccessful requests count
     * toward brute-force protection.
     * A successful login resets the practical
     * login-attempt problem for that IP.
     */
    skipSuccessfulRequests:
      true
  });

export const strictLimiter =
  rateLimit({
    windowMs:
      60 * 60 * 1000,

    max:
      env.NODE_ENV ===
        'production'
        ? 20
        : 200,

    handler:
      strictLimitHandler,

    standardHeaders:
      true,

    legacyHeaders:
      false
  });

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // Disable CSP for API (not needed for backend API)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

export const corsOptions = {
  // In production, replace with your actual frontend URL
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

export const corsMiddleware = cors(corsOptions);

/**
 * Sanitize user input - removes HTML, special characters, and trims whitespace
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove HTML tags and entities
  let sanitized = input.trim();
  sanitized = validator.escape(sanitized); // Escape HTML special chars
  sanitized = validator.trim(sanitized);

  return sanitized;
};

/**
 * Sanitize email - validates and normalizes
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;

  const trimmed = email.trim().toLowerCase();

  if (!validator.isEmail(trimmed)) {
    throw new Error('Invalid email format');
  }

  return trimmed;
};

/**
 * Sanitize phone number - validates format
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;

  const sanitized = phone.trim().replace(/\D/g, ''); // Remove non-digits

  if (!validator.isMobilePhone(sanitized, 'any')) {
    throw new Error('Invalid phone number format');
  }

  return sanitized;
};

/**
 * Validate password strength
 * Requires: 12+ chars, uppercase, lowercase, number, special char
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special character');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. '));
  }

  return true;
};

/**
 * Sanitize blood type - validates against allowed values
 */
export const sanitizeBloodType = (bloodType) => {
  const validTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  if (!bloodType || !validTypes.includes(bloodType.toUpperCase())) {
    throw new Error('Invalid blood type');
  }

  return bloodType.toUpperCase();
};

/**
 * Sanitize and validate name
 */
export const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') {
    return null;
  }

  const sanitized = validator
    .unescape(name)
    .trim()
    .normalize('NFKC');

  if (
    sanitized.length < 2 ||
    sanitized.length > 50
  ) {
    throw new Error(
      'Name must be between 2 and 50 characters'
    );
  }

  // Arabic, Latin, French accents,
  // spaces, apostrophes, and hyphens.
  if (!/^[\p{L}\p{M}\s'-]+$/u.test(sanitized)) {
    throw new Error(
      'Name contains invalid characters'
    );
  }

  return sanitized;
};

/**
 * Data sanitization middleware - sanitizes all request body and query params
 * EXCEPT sensitive fields like passwords
 */
export const sanitizeDataMiddleware = (req, res, next) => {
  // Fields that should NOT be sanitized (passwords, tokens, etc)
  const excludeFields = ['password', 'passwordConfirmation', 'refreshToken', 'accessToken'];

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      // Skip excluded fields and only sanitize strings
      if (!excludeFields.includes(key) && typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }

  // Sanitize query params
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }

  next();
};


/**
 * Generic error responses to prevent information leakage
 */
export const genericErrorHandler = (err, req, res, next) => {
  console.error('❌ [ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak sensitive information to client
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'An error occurred. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { debug: err.message })
  });
};


/**
 * Prevent response caching for sensitive endpoints
 */
export const noCacheMiddleware = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  next();
};

export default {
  generalLimiter,
  authLimiter,
  strictLimiter,
  helmetMiddleware,
  corsMiddleware,
  corsOptions,
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  validatePasswordStrength,
  sanitizeBloodType,
  sanitizeName,
  sanitizeDataMiddleware,
  genericErrorHandler,
  noCacheMiddleware,
};
