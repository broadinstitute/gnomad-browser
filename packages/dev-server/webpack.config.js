const path = require('path')

module.exports = {
  devServer: {
    clientLogLevel: 'none',
    contentBase: 'public',
    historyApiFallback: true,
    port: 8008,
    publicPath: '/static/js',
  },
  devtool: 'source-map',
  entry: {
    bundle: ['babel-polyfill', 'react-hot-loader/patch', './src/index.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules\/(?!p-cancelable)/,
        use: 'babel-loader',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
}
