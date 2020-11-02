module.exports = {
  extends: ['airbnb', 'airbnb/hooks', 'prettier', 'prettier/react'],
  env: {
    browser: true,
  },
  parser: 'babel-eslint',
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'func-names': ['warn', 'as-needed'],
    'react/jsx-filename-extension': ['error', { extensions: ['.js'] }],
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': 0,
    // https://github.com/airbnb/javascript/blob/6d05dd898acfec3299cc2be8b6188be542824965/packages/eslint-config-airbnb/rules/react.js#L489
    'react/static-property-placement': ['error', 'static public field'],
    // Does not handle initial state derived from props in constructor
    'react/state-in-constructor': 'off',
    // TODO: Use shorthand
    'react/jsx-fragments': 'off',
    'react/jsx-props-no-spreading': 'off',
  },
  overrides: [
    {
      // Set environment for tests
      files: ['**/*spec.js', '**/*test.js', 'tests/**/*.js'],
      env: {
        jest: true,
      },
    },
    {
      // Set environment for server-side code
      files: ['graphql-api/**/*.js', 'projects/*/src/server/**/*.js'],
      env: {
        browser: false,
        node: true,
      },
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
    {
      files: ['graphql-api/**/*.js'],
      rules: {
        'no-underscore-dangle': [
          'error',
          {
            allow: ['_source'], // allow _source for getting Elasticsearch source
          },
        ],
      },
    },
  ],
  parserOptions: {
    ecmaVersion: '2018',
  },
}
