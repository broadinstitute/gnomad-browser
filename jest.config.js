// https://jestjs.io/docs/en/configuration.html

module.exports = {
  projects: [
    {
      displayName: 'browser',
      testMatch: ['<rootDir>/browser/**/*.spec.js'],
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
    },
    {
      displayName: 'graphql-api',
      testMatch: ['<rootDir>/graphql-api/**/*.spec.js'],
    },
  ],
  roots: ['<rootDir>', '<rootDir>/tests'],
}
