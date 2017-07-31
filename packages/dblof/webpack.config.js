const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const isDev = (process.env.NODE_ENV === 'development')

const defineEnvPlugin = new webpack.DefinePlugin({
  __DEV__: isDev,
  'process.env.FETCH_FUNCTION': JSON.stringify(process.env.FETCH_FUNCTION),
})

const config = {
  devtool: 'source-map',
  entry: {
    app: [
      'babel-polyfill',
      'react-hot-loader/patch',
      './src/index',
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: true,
              localIdentName: '[name]__[local]___[hash:base64:5]',
            },
          },
          {
            loader: 'postcss-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    defineEnvPlugin,
    // new BundleAnalyzerPlugin({ openAnalyzer: false, analyzerPort: 8031 }),
  ],
  devServer: {
    contentBase: 'public',
    publicPath: '/static/js',
    port: 8013,
    historyApiFallback: true,
    // quiet: true,
  },
}

module.exports = config
