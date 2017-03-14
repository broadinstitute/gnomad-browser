/* eslint-disable global-require */
/* eslint-disable object-shorthand */

const webpack = require('webpack')
const path = require('path')

const config = {
  devtool: 'source-map',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
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
    // new webpack.optimize.UglifyJsPlugin(),
  ],
}

module.exports = config
