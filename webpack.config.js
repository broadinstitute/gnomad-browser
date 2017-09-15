/* eslint-disable global-require */
/* eslint-disable object-shorthand */

const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

// const ENTRY_POINT = (process.env.ENTRY_OINT === 'development')

const isDev = (process.env.NODE_ENV === 'development')

// const API_URL = config.get('API_URL')
const API_URL = 'http://gnomad-api.broadinstitute.org'
console.log('Webpack setting API: ', API_URL)

const defineEnvPlugin = new webpack.DefinePlugin({
  __DEV__: isDev,
  __ENTRY__: JSON.stringify(process.env.ENTRY_POINT),
  'process.env.FETCH_FUNCTION': JSON.stringify(process.env.FETCH_FUNCTION),
  'process.env.API_URL': JSON.stringify(API_URL),
})

const entries = isDev ?
  [
    // 'babel-polyfill',
    'react-hot-loader/patch',
    './src/index.js',
    // './src/index.js',
  ] :
  [
    // 'babel-polyfill',
    './src/index.js',
  ]

const webpackConfig = {
  devtool: 'source-map',
  entry: {
    bundle: entries,
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
        test: /\.svg$/,
        exclude: /node_modules/,
        use: 'svg-inline-loader',
      },
      {
        test: /\.csv$/,
        exclude: /node_modules/,
        use: 'dsv-loader',
      },
    ],
  },
  plugins: [
    defineEnvPlugin,
    new BundleAnalyzerPlugin({ openAnalyzer: false, analyzerPort: 8030 }),
  ],
  devServer: {
    contentBase: 'public',
    publicPath: '/static/js',
    port: 8008,
    historyApiFallback: true,
    // quiet: true,
    clientLogLevel: 'none',
    // stats: 'verbose',
  },
}

if (!isDev) {
  webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
    minimize: true,
    debug: false,
  }))
  webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
    beautify: false,
    mangle: {
      screw_ie8: true,
      keep_fnames: true,
    },
    compress: {
      screw_ie8: true,
    },
    comments: false,
  }))
}

module.exports = webpackConfig
