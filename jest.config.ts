// https://jestjs.io/docs/en/configuration.html

module.exports = {
  projects: [
    {
      displayName: 'browser',
      moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/tests/__mocks__/fileMock.js',
        // workaround for yet another extremely cursed aspect of the JS stack
        '^lodash-es$': 'lodash',
      },
      testMatch: ['<rootDir>/browser/**/*.spec.(js|jsx|ts|tsx)'],
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
      testEnvironment: 'jsdom',
      preset: 'ts-jest',
    },
    {
      displayName: 'graphql-api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/graphql-api/**/*.spec.(js|jsx|ts|tsx)'],
      preset: 'ts-jest',
    },
    {
      displayName: 'dataset-metadata',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/dataset-metadata/**/*.spec.(js|jsx|ts|tsx)'],
      preset: 'ts-jest',
    },
  ],
  roots: ['<rootDir>', '<rootDir>/tests'],
}
