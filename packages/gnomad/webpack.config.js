const path = require('path')

const config = {
  devtool: 'source-map',
  entry: {
    app: [
      'babel-polyfill',
      'react-hot-loader/patch',
      './src/example/index',
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
  devServer: {
    contentBase: 'public',
    publicPath: '/static/js',
    port: 8011,
    historyApiFallback: true,
    // quiet: true,
  },
}

module.exports = config
