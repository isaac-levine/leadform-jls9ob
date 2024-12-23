import type { Config } from '@jest/types';

/**
 * Creates and exports the Jest configuration for the Next.js web application
 * Version compatibility:
 * - Jest: ^29.0.0
 * - @testing-library/jest-dom: ^6.0.0
 * - @swc/jest: ^0.2.0
 */
const config: Config.InitialOptions = {
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    // Internal path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@ui/(.*)$': '<rootDir>/src/components/ui/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    
    // Handle static asset imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/tests/__mocks__/fileMock.js',
    
    // Acetunity UI and ShadCN component mappings
    '^@acetunity/(.*)$': '<rootDir>/node_modules/@acetunity/$1',
    '^@shadcn/(.*)$': '<rootDir>/node_modules/@shadcn/$1'
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/__tests__/**/*.tsx'
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/**/*.config.{ts,js}',
    '!src/types/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Transform configuration using SWC for faster testing
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic'
          }
        },
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true
        }
      }
    }]
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects'
  ],

  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: {
        warnOnly: true
      }
    }
  },

  // Test environment configuration
  testTimeout: 10000,
  verbose: true,
  
  // Handle ESM modules
  transformIgnorePatterns: [
    '/node_modules/(?!(@acetunity|@shadcn)/)'
  ],

  // Automatically clear mock calls and instances between tests
  clearMocks: true,
  
  // Indicates whether each individual test should be reported during the run
  silent: false,
  
  // Automatically restore mock state between every test
  restoreMocks: true
};

export default config;