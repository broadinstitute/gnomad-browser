const path = require('path')

const webpack = require('webpack')
const config = require('../../webpack.config')

const serverConfig = {
  // devtool: 'source-map',
  entry: {
    // app: ['./src/renderDom.js'],
    // vendor: ['babel-polyfill']
    bundle: ['babel-polyfill', './src/renderDom.js'],
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js',
  },
  // externals: {
  //   react: 'React',
  //   'react-dom': 'ReactDOM',
  // },
  plugins: config.plugins,
}

serverConfig.plugins.concat([
  new webpack.optimize.UglifyJsPlugin({
    beautify: false,
    comments: false,
    mangle: false,
  }),
  // new webpack.
])

serverConfig.module = config.module

module.exports = serverConfig
