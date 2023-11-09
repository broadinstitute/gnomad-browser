module.exports = {
  extends: [
    'airbnb',
    'airbnb/hooks',
    'prettier',
    'prettier/react',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', '@typescript-eslint'],
  rules: {
    // Using prettier rules here is redundant with the pre-commit hook.
    // Also, since we currently have a lot of non-compliant files, prettying
    // up every file in the codebase (as opposed to just changed files)
    // would add (even more) noise. Hence, the decision not to do it, at least
    // in the scope of the current PR.
    //
    // However, we want to keep the prettier eslint plugin itself, since that
    // disables a lot of eslint formatting rules we don't want.
    'prettier/prettier': 'off',
    'func-names': ['warn', 'as-needed'],
    'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx', 'ts', '.tsx'] }],
    'import/prefer-default-export': 0,
    // https://github.com/airbnb/javascript/blob/6d05dd898acfec3299cc2be8b6188be542824965/packages/eslint-config-airbnb/rules/react.js#L489
    'react/static-property-placement': ['error', 'static public field'],
    // Does not handle initial state derived from props in constructor
    // TODO: Use shorthand
    'react/jsx-fragments': 'off',
    camelcase: 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-underscore-dangle': 'off',
    'no-bitwise': ['error', { int32Hint: true }],
    'import/extensions': ['error', { ts: 'allow', tsx: 'allow', json: 'allow' }],
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'react/prop-types': 'off',
    'react/require-default-props': 'off',
    'react/default-props-match-prop-types': 'off',
    'react/no-unused-prop-types': 'off',
    'no-restricted-globals': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    'import/order': 'off',
    // Rules disabled below this line are ones that we might want to re-enable
    // someday but that will entail more work, either because lots of distinct
    // LOCs will have to be updated, or because it's not immediately obvious
    // why eslint is flagging something.
    'react/state-in-constructor': 'off',
    'react/jsx-props-no-spreading': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'no-use-before-define': 'off',
    'react/destructuring-assignment': 'off',
    'prefer-destructuring': 'off',
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": ["error"]
  },
  overrides: [
    {
      // Set environment for tests
      files: ['**/*spec.ts', '**/*test.ts', 'tests/**/*.ts'],
      env: {
        jest: true,
      },
    },
    {
      // Allow using devDependencies from workspace root in browser webpack config
      files: ['browser/webpack.config.js', 'browser/build/*.js'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { packageDir: ['./browser', '.'] }],
      },
    },
    {
      // Set environment for server-side code
      files: ['graphql-api/**/*.ts', 'graphql-api/**/*.js'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: '2018',
  },
}
