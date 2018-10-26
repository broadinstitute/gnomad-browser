const path = require('path')

const webpack = require('webpack')

const pkg = require('../package.json')
const { aliases, definitions } = require('./sharedConfig')

const projectDirectory = path.resolve(__dirname, '..')

const config = {
  devtool: 'source-map',
  entry: {
    server: path.resolve(__dirname, '../src/server/server.js'),
  },
  externals(context, request, callback) {
    // Do not bundle dependencies
    return context.includes(projectDirectory) && request in pkg.dependencies
      ? callback(null, `commonjs ${request}`)
      : callback()
  },
  node: false, // Do not replace Node builtins
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: '/',
    filename: '[name].js',
  },
  plugins: [new webpack.DefinePlugin(definitions)],
  resolve: {
    alias: aliases,
  },
  target: 'node',
}

module.exports = config
