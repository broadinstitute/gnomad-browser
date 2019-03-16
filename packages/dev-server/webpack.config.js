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
    bundle: './src/index.js',
  },
  mode: 'development',
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
        use: 'file-loader',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, './public/static/js'),
    publicPath: '/static/js',
    filename: '[name].js',
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
}
