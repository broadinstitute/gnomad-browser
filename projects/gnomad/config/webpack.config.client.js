const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

const isDev = process.env.NODE_ENV === 'development'

const definitions = {
  'process.env.GNOMAD_API_URL': JSON.stringify(process.env.GNOMAD_API_URL),
}

const config = {
  devServer: {
    historyApiFallback: true,
    port: 8008,
    publicPath: '/',
    stats: 'errors-only',
  },
  devtool: 'source-map',
  entry: {
    bundle: path.resolve(__dirname, '../src/index.js'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
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
      template: path.resolve(__dirname, '../src/index.html'),
    }),
  ],
}

if (isDev) {
  config.entry.bundle = ['react-hot-loader/patch', config.entry.bundle]
} else {
  config.plugins.push(new webpack.optimize.UglifyJsPlugin())
}

module.exports = config
