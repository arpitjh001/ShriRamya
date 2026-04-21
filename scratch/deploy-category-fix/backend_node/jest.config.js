module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds timeout for tests
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/db.js',
    '!src/app.js',
    '!src/server.js',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: false,
  testSequencer: '@jest/test-sequencer',
  // Setup files to run before tests
  setupFilesAfterEnv: ['./tests/setup.js'],
  // Ignore node_modules
  testPathIgnorePatterns: ['/node_modules/'],
  // Module name mapper if needed
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
