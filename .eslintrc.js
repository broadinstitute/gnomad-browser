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
    'func-names': 0,
    'react/jsx-filename-extension': ['error', { extensions: ['.js'] }],
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
    ecmaVersion: '2018',
  },
}
