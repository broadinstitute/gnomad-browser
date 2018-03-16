const path = require('path')
const webpack = require('webpack')

const config = require('../../webpack.config')

const umdConfig = {
  // devtool: 'source-map',

  /**
   * This will output a javascript bundle gnomadt2d.js in ./public/static/js
   */

  entry: {
    gnomadt2d: './src/index.umd.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/static/js'),
    filename: '[name].js',
    libraryTarget: 'umd',

  /**
   * When the bundle is included in another project through a script tag,
   * the components will be available in the GnomadT2d namespace
   */

    library: 'GnomadT2d',
  },

  /**
   * You'll also need to include react and react-dom along with gnomadt2d.js
   */

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
