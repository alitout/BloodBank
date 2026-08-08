import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';
import cors from 'cors';

const rateLimitHandler = (req, res) => {
  res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
};

const authLimitHandler = (req, res) => {
  res.status(429).json({ error: 'Too many authentication attempts. Please try again in 15 minutes.' });
};

const strictLimitHandler = (req, res) => {
  res.status(429).json({ error: 'Too many operations from this IP. Please try again later.' });
};

/**
 * General API rate limiter: 100 requests per 15 minutes per IP
 * Skips auth routes (they have their own limiter with stricter limits)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: rateLimitHandler,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip auth routes and health check (they have their own limiters)
    // Also skip preflight OPTIONS requests to prevent browser CORS preflight from counting against the limit
    return req.path === '/health' || req.path.startsWith('/api/auth') || req.method === 'OPTIONS';
  }
});

/**
 * Auth rate limiter: 50 attempts per 15 minutes per IP (increased for development testing)
 * Applied to: /auth/login, /auth/register, /auth/refresh-token
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased from 5 to 50 for development
  handler: authLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations: 10 per hour
 * Applied to: admin operations, profile updates, password changes
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  handler: strictLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
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
