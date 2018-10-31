const babelConfig = require('./babel.config')

const moduleResolverPluginConfig = babelConfig.plugins.find(
  pluginConfig => Array.isArray(pluginConfig) && pluginConfig[0] === 'module-resolver'
)

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
    ecmaVersion: '2018',
  },
  settings: {
    'import/resolver': {
      // eslint-import-resolver-babel-module does not support babel.config.js so
      // alias configuration must be duplicated here
      // https://github.com/tleunen/eslint-import-resolver-babel-module/issues/89
      'babel-module': moduleResolverPluginConfig[1],
    },
  },
}
