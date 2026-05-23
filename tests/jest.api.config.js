/**
 * Jest Configuration for API Tests
 * ShriRamya E-Commerce Platform
 */

module.exports = {
  // Root directory for tests
  rootDir: '.',
  
  // Test file pattern
  testMatch: ['**/api/**/*.test.js'],
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Run tests in series (important for API tests with state)
  maxWorkers: 1,
  
  // Verbose output
  verbose: true,
  
  // Collect coverage
  collectCoverage: false,
  
  // Coverage directory
  coverageDirectory: 'coverage/api',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'API Test Report',
      outputPath: 'test-results/api-test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true,
    }],
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'api-junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],
  
  // Setup files
  setupFilesAfterEnv: ['./api/setup.js'],
  
  // Test environment
  testEnvironment: 'node',
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Bail on first failure (optional - set to false for full report)
  bail: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
};
