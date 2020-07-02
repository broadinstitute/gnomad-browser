// https://jestjs.io/docs/en/configuration.html

module.exports = {
  projects: [
    {
      displayName: 'gnomad',
      testMatch: ['<rootDir>/projects/gnomad/**/*.spec.js'],
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
    },
    {
      displayName: 'gnomad-api',
      testMatch: ['<rootDir>/projects/gnomad-api/**/*.spec.js'],
    },
  ],
  roots: ['<rootDir>', '<rootDir>/tests'],
}
