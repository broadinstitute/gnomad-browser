/* eslint-disable global-require */

module.exports = {
  autoprefixer: {
    browsers: ['last 2 version', 'Firefox 15', 'iOS 8'],
  },
  plugins: [
    require('postcss-import'),
    require('postcss-cssnext'),
  ],
}
