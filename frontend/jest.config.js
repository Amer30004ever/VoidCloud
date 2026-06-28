/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    testEnvironment: 'jsdom',
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    modulePathIgnorePatterns: ['<rootDir>/.next/'],
};

module.exports = createJestConfig(customJestConfig);
