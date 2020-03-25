// https://jestjs.io/docs/en/configuration.html

const fs = require('fs')
const path = require('path')

const packages = fs
  .readdirSync(path.join(__dirname, 'packages'), { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)

module.exports = {
  projects: [
    ...packages.map(pkg => ({
      displayName: pkg,
      testMatch: [`<rootDir>/packages/${pkg}/**/*.spec.js`],
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
    })),
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
}
