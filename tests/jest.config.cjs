/**
 * Root Jest config for all microservice unit tests.
 * Runs every *.spec.ts under services/ and *.test.mjs under scripts/.
 * Dependencies live in tests/node_modules (installed once at repo test-root).
 */
const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..'),
  testMatch: [
    '<rootDir>/services/**/*.spec.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  // tests/e2e/** are Playwright specs — they must not be collected by Jest.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/tests/e2e/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json'],
  modulePaths: [path.resolve(__dirname, 'node_modules')],
  transform: {
    '^.+\\.tsx?$': [require.resolve('ts-jest'), {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2021',
        moduleResolution: 'node',
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        strict: false,
        resolveJsonModule: true,
      },
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  transformIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  moduleDirectories: ['node_modules', path.resolve(__dirname, 'node_modules')],
  verbose: true,
};
