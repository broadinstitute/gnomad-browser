const path = require('path')

const webpack = require('webpack')
const config = require('../../webpack.config')

const umdConfig = {
  devtool: 'source-map',
  entry: {
    'react-gnomad': './src/index.umd.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist/umd'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'ReactGnomad',
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      comments: false,
      mangle: false,
    }),
  ],
}

umdConfig.module = config.module

module.exports = umdConfig
