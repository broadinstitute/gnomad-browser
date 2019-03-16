const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

const isDev = process.env.NODE_ENV === 'development'

const definitions = {
  'process.env.GNOMAD_API_URL': JSON.stringify(process.env.GNOMAD_API_URL),
}

const gaTrackingId = process.env.GA_TRACKING_ID
if (process.env.NODE_ENV === 'production' && !gaTrackingId) {
  console.log('\nWarning: No GA tracking ID for production build\n')
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
    bundle: path.resolve(__dirname, '../src/client/index.js'),
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
      {
        test: /\.(gif|jpg|png)$/,
        use: {
          loader: 'file-loader',
          options: {
            outputPath: 'assets/images',
          },
        },
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, '../dist/public'),
    publicPath: '/',
    filename: isDev ? '[name].js' : '[name]-[contenthash].js',
  },
  plugins: [
    new webpack.DefinePlugin(definitions),
    new CopyWebpackPlugin([path.resolve(__dirname, '../src/client/opensearch.xml')], {
      writeToDisk: true,
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/client/index.html'),
      gaTrackingId: process.env.GA_TRACKING_ID,
    }),
  ],
}

if (isDev) {
  config.resolve = {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  }
}

module.exports = config
