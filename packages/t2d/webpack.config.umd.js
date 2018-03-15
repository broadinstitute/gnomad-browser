const path = require('path')

const webpack = require('webpack')
const config = require('../../webpack.config')

const umdConfig = {
  devtool: 'source-map',
  entry: {
    gnomadt2d: './src/index.umd.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/static/js'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'GnomadT2d',
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  plugins: config.plugins,
}

umdConfig.plugins.concat([
  new webpack.optimize.UglifyJsPlugin({
    beautify: false,
    comments: false,
    mangle: false,
  }),
])

umdConfig.module = config.module

module.exports = umdConfig
