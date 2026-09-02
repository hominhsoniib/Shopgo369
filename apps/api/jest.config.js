/**
 * Jest config cho NestJS API (apps/api).
 * Dự án hiện CHƯA có jest/ts-jest trong devDependencies — xem SETUP_TESTS.md.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  collectCoverageFrom: ['**/*.service.ts'],
  coverageDirectory: '../coverage',
};
