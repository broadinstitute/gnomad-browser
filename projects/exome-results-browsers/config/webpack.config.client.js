const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

const { aliases, browserConfig, definitions } = require('./sharedConfig')

const isDev = process.env.NODE_ENV === 'development'

const config = {
  devServer: {
    historyApiFallback: true,
    port: 8012,
    proxy: {
      '/api': 'http://localhost:8007',
    },
    publicPath: '/',
    stats: 'errors-only',
  },
  devtool: 'source-map',
  entry: {
    bundle: path.resolve(__dirname, '../src/client/index.js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            rootMode: 'upward',
          },
        },
      },
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: 'graphql-tag/loader',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, '../dist/public'),
    publicPath: '/',
    filename: '[name].js',
  },
  plugins: [
    new webpack.DefinePlugin(definitions),
    new HtmlWebpackPlugin({
      template: './src/client/index.html',
      title: browserConfig.pageTitle,
    }),
  ],
  resolve: {
    alias: aliases,
  },
}

if (isDev) {
  config.entry.bundle = ['react-hot-loader/patch', config.entry.bundle]
} else {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin())
}

module.exports = config
