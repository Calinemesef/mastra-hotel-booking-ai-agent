import { jest } from '@jest/globals';

// Mock environment variables
process.env.LITEAPI_KEY = 'test-api-key';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}; 