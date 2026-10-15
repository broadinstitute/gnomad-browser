// Scoped offline tests; intentionally does not alter the repository's test projects.
module.exports = {
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/development/str-context-v2/*.spec.ts'],
  preset: 'ts-jest',
}
