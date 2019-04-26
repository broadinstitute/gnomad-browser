const path = require('path')

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: ['last 2 versions', 'ie >= 10'],
        useBuiltIns: 'entry',
        corejs: 3,
        exclude: ['transform-typeof-symbol'],
        modules: false,
      },
    ],
    [
      '@babel/preset-react',
      {
        useBuiltIns: false,
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    'inline-react-svg',
    'react-hot-loader/babel',
    'styled-components',
    [
      'module-resolver',
      {
        alias: {
          '@resources': path.resolve(__dirname, './resources'),
        },
      },
    ],
  ],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-runtime'],
    },
  },
}
