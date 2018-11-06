const path = require('path')

const pkg = require('../package.json')

const projectDirectory = path.resolve(__dirname, '..')

const isDev = process.env.NODE_ENV === 'development'

const config = {
  devtool: 'source-map',
  entry: {
    server: [path.resolve(__dirname, '../src/server/server.js')],
  },
  externals(context, request, callback) {
    // Do not bundle dependencies
    return context.includes(projectDirectory) && request in pkg.dependencies
      ? callback(null, `commonjs ${request}`)
      : callback()
  },
  mode: isDev ? 'development' : 'production',
  node: false, // Do not replace Node builtins
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: '/',
    filename: '[name].js',
  },
  target: 'node',
}

module.exports = config
