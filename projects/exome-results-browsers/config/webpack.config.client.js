const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')

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
      '/api': 'http://localhost:8007',
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
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: 'graphql-tag/loader',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, '../dist/public'),
    publicPath: '/',
    filename: '[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/client/index.html',
    }),
  ],
  resolve: {
    alias: {
      '@browser': path.resolve(__dirname, '../browsers', process.env.BROWSER, 'src'),
    },
  },
}

if (isDev) {
  config.entry.bundle = ['react-hot-loader/patch', config.entry.bundle]
}

module.exports = config
