module.exports = {
  extends: [
    'airbnb',
    'prettier',
    'prettier/react',
  ],
  env: {
    browser: true,
  },
  parser: 'babel-eslint',
  plugins: [
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 0,
    'func-names': ['warn', 'as-needed'],
    'react/jsx-filename-extension': ['error', { extensions: ['.js'] }],
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': 0,
  },
  overrides: [
    {
      // Set environment for tests
      files: ['**/*spec.js', '**/*test.js'],
      env: {
        jest: true,
      },
    },
    {
      // Set environment for server-side code
      files: ['projects/gnomad-api/**/*.js', 'projects/*/src/server/**/*.js'],
      env: {
        browser: false,
        node: true,
      },
    },
    {
      // Allow importing from resources only in package examples
      files: ['packages/**/example/*.js'],
      rules: {
        'import/no-unresolved': ['error', { ignore: ['^@resources\/'] }],
      },
    },
    {
      // Ignore @browser webpack alias in exome-results-browsers
      files: ['projects/exome-results-browsers/**/*.js'],
      rules: {
        'import/no-unresolved': ['error', { ignore: ['^@browser\/'] }],
      },
    },
  ],
  parserOptions: {
    ecmaVersion: '2018',
  },
}
