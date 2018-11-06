const path = require('path')
const webpack = require('webpack')

module.exports = {
  /**
   * This will output a javascript bundle gnomadt2d.js in ./public/static/js
   */
  entry: {
    gnomadt2d: './src/index.umd.js',
  },
  /**
   * You'll also need to include react and react-dom along with gnomadt2d.js
   */
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!p-cancelable)/,
        use: {
          loader: 'babel-loader',
          options: {
            rootMode: 'upward',
          },
        },
      },
    ],
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
  plugins: [
    new webpack.DefinePlugin({
      'process.env.GNOMAD_API_URL': JSON.stringify(process.env.GNOMAD_API_URL),
    }),
  ]
}
