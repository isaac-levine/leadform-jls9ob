import mongoose, { ConnectOptions } from 'mongoose';

// Environment variables with defaults
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_capture';
const DATABASE_NAME = process.env.DATABASE_NAME || 'lead_capture';
const MONGODB_MIN_POOL_SIZE = Number(process.env.MONGODB_MIN_POOL_SIZE || '2');
const MONGODB_MAX_POOL_SIZE = Number(process.env.MONGODB_MAX_POOL_SIZE || '10');

/**
 * MongoDB connection options optimized for production use with MongoDB Atlas
 * Includes security, performance, and reliability configurations
 */
export const databaseConfig = {
  uri: MONGODB_URI,
  options: {
    // Connection and Pooling Settings
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: MONGODB_MAX_POOL_SIZE,
    minPoolSize: MONGODB_MIN_POOL_SIZE,
    
    // Timeout Configurations
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    
    // Write Concern Settings
    retryWrites: true,
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 5000
    },
    
    // Read Preferences
    readPreference: 'primary',
    readConcern: {
      level: 'majority'
    },
    
    // Security Settings
    ssl: true,
    authSource: 'admin',
    
    // Performance Optimizations
    autoIndex: true,
    autoCreate: true,
    
    // MongoDB Server API Version
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true
    }
  } as ConnectOptions
};

/**
 * Establishes and manages connection to MongoDB database
 * Implements comprehensive error handling and connection monitoring
 * @returns Promise<void>
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Validate required environment variables
    if (!MONGODB_URI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Configure mongoose debug mode for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true);
    }

    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      console.info('Successfully connected to MongoDB database');
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB connection reestablished');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB connection closure:', error);
        process.exit(1);
      }
    });

    // Attempt database connection
    await mongoose.connect(databaseConfig.uri, databaseConfig.options);

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // Implement exponential backoff retry logic for production
    if (process.env.NODE_ENV === 'production') {
      console.info('Retrying connection in 5 seconds...');
      setTimeout(() => connectDatabase(), 5000);
    } else {
      throw error;
    }
  }
};

// Export mongoose instance for direct access if needed
export { mongoose };