const fs = require('fs')
const path = require('path')
// Workaround for https://github.com/babel/babel/issues/10965
const browserslist = fs
  .readFileSync(path.resolve(__dirname, 'browser/.browserslistrc'), { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

module.exports = {
  presets: [
    ['@babel/preset-typescript'],
    [
      '@babel/preset-env',
      {
        targets: browserslist,
        useBuiltIns: 'entry',
        corejs: 3,
        exclude: ['transform-typeof-symbol'],
        modules: process.env.NODE_ENV === 'test' ? 'auto' : false,
      },
    ],
    [
      '@babel/preset-react',
      {
        useBuiltIns: false,
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-class-properties', 'styled-components'],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-runtime'],
    },
  },
}
