/**
 * Main router configuration aggregating all API routes with comprehensive security,
 * validation, monitoring and error handling middleware.
 * @module api/routes
 * @version 1.0.0
 */

import { Router } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.4.1

// Internal route imports
import userRouter from './user.routes';
import formRouter from './form.routes';
import leadRouter from './lead.routes';
import messageRouter from './message.routes';

// Middleware imports
import { authenticate } from '../middlewares/auth.middleware';
import { sanitizeRequest } from '../middlewares/validation.middleware';
import { logger } from '../../utils/logger.utils';

// Initialize main router
const router = Router();

// Global rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 15 // Block for 15 minutes
});

/**
 * Applies global middleware to all routes
 * Implements security headers, CORS, compression, and basic protection
 */
const applyGlobalMiddleware = () => {
  // Security headers
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // CORS configuration
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Response compression
  router.use(compression());

  // Request sanitization
  router.use(sanitizeRequest);

  // Global rate limiting
  router.use(async (req, res, next) => {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch {
      res.status(429).json({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });

  // Request logging
  router.use((req, res, next) => {
    logger.http(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    next();
  });
};

// Apply global middleware
applyGlobalMiddleware();

/**
 * Mount API routes with appropriate middleware chains
 * Each route module has its own specific middleware and validation
 */

// User routes - Authentication and user management
router.use(
  '/api/users',
  userRouter
);

// Form routes - Form creation and management
router.use(
  '/api/forms',
  authenticate, // Require authentication for all form routes
  formRouter
);

// Lead routes - Lead capture and management
router.use(
  '/api/leads',
  leadRouter // Some lead routes are public (e.g., form submission)
);

// Message routes - SMS message handling
router.use(
  '/api/messages',
  authenticate, // Require authentication for all message routes
  messageRouter
);

// Health check endpoint
router.get('/health', (_, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * Global error handling middleware
 * Provides consistent error responses and logging
 */
router.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', {
    error: err,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

/**
 * 404 handler for unmatched routes
 */
router.use((req, res) => {
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method
  });

  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
});

export default router;