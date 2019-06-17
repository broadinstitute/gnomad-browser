const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')

if (process.env.BROWSER === undefined) {
  console.error('BROWSER environment variable must be set')
  process.exit(1)
}

const currentBrowser = process.env.BROWSER

const isDev = process.env.NODE_ENV === 'development'

const outputRoot = path.resolve(__dirname, '../dist', currentBrowser)

const config = {
  devServer: {
    historyApiFallback: true,
    port: 8000,
    proxy: {
      '/': `http://localhost:${process.env.PORT}`,
    },
    publicPath: '/',
    stats: 'errors-only',
    // Since the server reads the index.ejs template file, it needs to be written to disk when
    // using webpack-dev-server.
    writeToDisk: true,
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
    path: path.join(outputRoot, 'public'),
    publicPath: '/',
    filename: isDev ? '[name].js' : '[name]-[contenthash].js',
  },
  plugins: [
    // Inject the JS bundle into the server's HTML template
    new HtmlWebpackPlugin({
      filename: path.join(outputRoot, 'index.ejs'),
      // If no loader is specified, HtmlWebpackPlugin will render the template using Lodash.
      // Using raw-loader here skips the compile time render so that we can render the
      // template at run time.
      template: 'raw-loader!./src/server/index.ejs',
    }),
  ],
  resolve: {
    alias: {
      '@browser': path.resolve(__dirname, '../browsers', currentBrowser, 'src'),
    },
  },
}

if (isDev) {
  config.resolve.alias['react-dom'] = '@hot-loader/react-dom'
}

module.exports = config
