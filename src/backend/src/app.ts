/**
 * Main Express application configuration file for Lead Capture & SMS Platform
 * Implements core middleware, security features, and API routing
 * @version 1.0.0
 */

import express, { Application } from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import pino from 'pino'; // ^8.0.0
import expressPinoLogger from 'express-pino-logger'; // ^7.0.0
import rateLimit from 'express-rate-limit'; // ^6.0.0

// Internal imports
import router from './api/routes';
import { errorHandler, notFoundHandler } from './api/middlewares/error.middleware';
import { connectDatabase } from './config/database.config';
import { validateRequest } from './api/middlewares/validation.middleware';

// Initialize Express application
const app: Application = express();

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize structured logging
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

/**
 * Configures and initializes all application middleware
 * Implements security, performance, and monitoring features
 */
const initializeMiddleware = (app: Application): void => {
  // Security middleware
  app.use(helmet({
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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400
  }));

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Response compression
  app.use(compression());

  // Logging middleware
  app.use(morgan('combined'));
  app.use(expressPinoLogger({ logger }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Request validation
  app.use(validateRequest);
};

/**
 * Initializes the Express application with all configurations
 * @returns Configured Express application
 */
const initializeApp = async (): Promise<Application> => {
  try {
    // Initialize middleware
    initializeMiddleware(app);

    // Connect to database
    await connectDatabase();

    // Mount API routes
    app.use('/api', router);

    // Health check endpoint
    app.get('/health', (_, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start server
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      });
    }

    return app;
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

/**
 * Handles graceful shutdown of server
 * @param server - HTTP server instance
 */
const gracefulShutdown = async (server: any): Promise<void> => {
  try {
    logger.info('Initiating graceful shutdown...');

    // Stop accepting new requests
    server.close(async () => {
      try {
        // Close database connection
        await mongoose.connection.close();
        logger.info('Database connection closed.');

        // Exit process
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Error initiating shutdown:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown(app));
process.on('SIGINT', () => gracefulShutdown(app));

// Initialize application
initializeApp().catch((error) => {
  logger.error('Application initialization failed:', error);
  process.exit(1);
});

export default app;