const path = require('path')

const webpack = require('webpack')

const config = require('../../webpack.config')

const umdConfig = {
  devtool: 'source-map',
  entry: {
    genepage: ['babel-polyfill', './src/index.umd.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist/umd'),
    filename: '[name]-1517593459.js',
    libraryTarget: 'umd',
    library: 'ReactGnomad',
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
