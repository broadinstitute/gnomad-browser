/* eslint-disable global-require */
/* eslint-disable object-shorthand */

const webpack = require('webpack')
const path = require('path')
const config = require('config')

const isDev = (process.env.NODE_ENV === 'development')

const API_URL = config.get('API_URL')
console.log('Webpack setting API: ', API_URL)

const defineEnvPlugin = new webpack.DefinePlugin({
  __DEV__: isDev,
  'process.env.API_URL': JSON.stringify(API_URL),
})

const webpackConfig = {
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
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, path.resolve(__dirname, 'src/RegionViewer/get-test-data.js')],
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: true,
              localIdentName: '[name]__[local]___[hash:base64:5]',
            },
          },
          {
            loader: 'postcss-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    defineEnvPlugin,
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      utilities: path.resolve(__dirname, 'src/utilities'),
      data: path.resolve(__dirname, 'test/data'),
    },
  },
  devServer: {
    contentBase: 'public',
    publicPath: '/static/js',
    port: 8010,
    historyApiFallback: true,
    quiet: true,
    clientLogLevel: "none",
  },
}

if (!isDev) {
  webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin())
}

module.exports = webpackConfig
