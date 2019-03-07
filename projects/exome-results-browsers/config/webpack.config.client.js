const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin')

if (process.env.BROWSER === undefined) {
  console.error('BROWSER environment variable must be set')
  process.exit(1)
}

const isDev = process.env.NODE_ENV === 'development'

const config = {
  devServer: {
    historyApiFallback: true,
    port: 8012,
    proxy: {
      '/': 'http://localhost:8007',
    },
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
    ],
  },
  output: {
    path: path.resolve(__dirname, '../dist/public'),
    publicPath: '/',
    filename: isDev ? '[name].js' : '[name]-[contenthash].js',,
  },
  plugins: [
    // Inject the JS bundle into the server's HTML template
    new HtmlWebpackPlugin({
      filename: path.resolve(__dirname, '../dist/index.ejs'),
      // If no loader is specified, HtmlWebpackPlugin will render the template using Lodash.
      // Using raw-loader here skips the compile time render so that we can render the
      // template at run time.
      template: 'raw-loader!./src/server/index.ejs',
      // Since the server reads the template file, it needs to be written to disk when
      // using webpack-dev-server.
      alwaysWriteToDisk: true,
    }),
    new HtmlWebpackHarddiskPlugin(),
  ],
  resolve: {
    alias: {
      '@browser': path.resolve(__dirname, '../browsers', process.env.BROWSER, 'src'),
    },
  },
}

if (isDev) {
  config.resolve.alias['react-dom'] = '@hot-loader/react-dom'
}

module.exports = config
