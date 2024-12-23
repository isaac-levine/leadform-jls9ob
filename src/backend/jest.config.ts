import type { Config } from '@jest/types';
// ts-jest version ^29.0.0
import { defaults as tsjPreset } from 'ts-jest/presets';

/**
 * Jest configuration for the AI-Driven Lead Capture & SMS Platform backend service.
 * This configuration sets up the test environment, coverage reporting, module resolution,
 * and other test-specific settings.
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define root directories for test discovery
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns to match
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx)',
    '**/?(*.)+(spec|test).+(ts|tsx)'
  ],

  // TypeScript file transformation configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Module path aliases mapping
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Coverage configuration
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',     // Console output
    'lcov',     // HTML report
    'json',     // JSON report
    'html'      // Detailed HTML report
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',        // Exclude declaration files
    '!src/types/**/*',       // Exclude type definitions
    '!src/interfaces/**/*'   // Exclude interfaces
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test execution settings
  verbose: true,             // Detailed test output
  testTimeout: 10000,        // 10 second timeout per test
  clearMocks: true,          // Clear mocks between tests
  restoreMocks: true,        // Restore mocked implementations

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ]
};

export default config;