const path = require('path')

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
    'no-shadow': 0,
    'no-console': 0,
    'func-names': 0,
    'spaced-comment': 0,
    'react/forbid-prop-types': 0,
    'no-plusplus': 0,
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'jsx-a11y/href-no-hash': 0,
    'import/no-mutable-exports': 0,
    'no-use-before-define': 0,
    'no-unused-vars': ['error', {
      ignoreRestSiblings: true,
      varsIgnorePattern: '',
    }],
    'import/prefer-default-export': 0,
    // 'import/no-extraneous-dependencies': ['error', {'devDependencies': ['**/*.test.js', '**/*.spec.js', '**/*.example.js']}],
    'import/no-extraneous-dependencies': 0,
  },
  overrides: [
    {
      files: ['**/*spec.js', '**/*test.js'],
      env: {
        jest: true,
      },
    },
  ],
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  settings: {
    'import/resolver': {
      'babel-module': {},
    },
  },
}
