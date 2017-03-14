const path =  require('path')
const config = require('./webpack.config')

const devConfig = {
  devtool: 'source-map',
  entry: {
    demo: [
      'babel-polyfill',
      'react-hot-loader/patch',
      './src/demo/index',
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
  devServer: {
    contentBase: 'public',
    publicPath: '/static/js',
    port: 8010,
    historyApiFallback: true,
    // quiet: true,
  },
}

devConfig.module = config.module

module.exports = devConfig
