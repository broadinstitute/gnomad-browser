// https://jestjs.io/docs/en/configuration.html

module.exports = {
  preset: 'ts-jest',
  projects: [
    {
      displayName: 'browser',
      moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/tests/__mocks__/fileMock.js',
      },
      testMatch: ['<rootDir>/browser/**/*.spec.[jt]s?(x)'],
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'graphql-api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/graphql-api/**/*.spec.[jt]s?(x)'],
    },
    {
      displayName: 'dataset-metadata',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/dataset-metadata/**/*.spec.[jt]s?(x)'],
    },
  ],
  roots: ['<rootDir>', '<rootDir>/tests'],
  transform: {
    '.': 'ts-jest',
  },
}
