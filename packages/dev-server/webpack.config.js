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
    bundle: ['react-hot-loader/patch', './src/index.js'],
  },
  mode: 'development',
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
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
}
