const path = require('path')

const webpack = require('webpack')

const isDev = process.env.NODE_ENV === 'development'

const webpackConfig = {
  devServer: {
    clientLogLevel: 'none',
    contentBase: 'public',
    historyApiFallback: true,
    port: 8008,
    publicPath: '/static/js',
  },
  devtool: 'source-map',
  entry: {
    bundle: './src/index.js',
  },
  mode: isDev ? 'development' : 'production',
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
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.GNOMAD_API_URL': JSON.stringify(
        process.env.GNOMAD_API_URL || 'http://gnomad-api.broadinstitute.org'
      ),
      'process.env.VARIANT_FX_API_URL': JSON.stringify(
        process.env.VARIANT_FX_API_URL || 'http://variantfx.org:4000/graphql'
      ),
    }),
  ],
}

if (isDev) {
  webpackConfig.resolve = {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  }
}

module.exports = webpackConfig
