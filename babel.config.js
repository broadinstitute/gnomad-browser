const path = require('path')

module.exports = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['last 2 versions', 'ie >= 10'],
        },
        useBuiltIns: 'entry',
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
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
}
