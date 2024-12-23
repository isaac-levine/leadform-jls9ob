/**
 * Entry point for the Node.js backend server implementing the Lead Capture & SMS Platform
 * Initializes and manages the Express application with comprehensive error handling,
 * graceful shutdown, health monitoring, and production-ready logging.
 * 
 * @version 1.0.0
 */

import http from 'http';
import app from './app';
import { logger } from './utils/logger.utils';

// Environment variables with defaults
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);

// Track active connections for graceful shutdown
let server: http.Server;
const activeConnections = new Set<http.Socket>();

/**
 * Initializes and starts the HTTP server with comprehensive setup and monitoring
 * @returns Promise resolving to running HTTP server instance
 */
async function startServer(): Promise<http.Server> {
  try {
    // Create HTTP server
    server = http.createServer(app);

    // Track active connections
    server.on('connection', (connection) => {
      activeConnections.add(connection);
      connection.on('close', () => {
        activeConnections.delete(connection);
      });
    });

    // Start server
    return new Promise((resolve) => {
      server.listen(PORT, () => {
        logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
        resolve(server);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    throw error;
  }
}

/**
 * Manages graceful server shutdown with connection draining
 * @param server HTTP server instance
 */
async function handleShutdown(server: http.Server): Promise<void> {
  logger.info('Initiating graceful shutdown...');

  // Stop accepting new connections
  server.close(() => {
    logger.info('Server closed. No longer accepting connections.');
  });

  // Set shutdown timeout
  const shutdownTimeout = setTimeout(() => {
    logger.warn('Shutdown timeout reached. Forcing process exit.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Close all active connections
    activeConnections.forEach((socket) => {
      socket.destroy();
    });

    logger.info('All connections closed successfully');
    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error as Error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Handles uncaught exceptions with logging and graceful shutdown
 * @param error Uncaught error
 */
function handleUncaughtError(error: Error): void {
  logger.error('Uncaught exception:', error);
  
  // Attempt graceful shutdown
  if (server) {
    handleShutdown(server).catch((shutdownError) => {
      logger.error('Error during shutdown after uncaught exception:', shutdownError);
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
}

/**
 * Performs periodic health checks of the server
 * @returns Promise resolving to health status
 */
async function checkHealth(): Promise<boolean> {
  try {
    // Add health checks here (e.g., database connectivity, SMS provider status)
    return true;
  } catch (error) {
    logger.error('Health check failed:', error as Error);
    return false;
  }
}

// Set up process signal handlers
process.on('SIGTERM', () => handleShutdown(server));
process.on('SIGINT', () => handleShutdown(server));
process.on('uncaughtException', handleUncaughtError);
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason as Error);
});

// Start health monitoring
setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

// Start server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default server;