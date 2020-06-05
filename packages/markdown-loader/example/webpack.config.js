const path = require('path')

const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: {
    bundle: path.resolve(__dirname, 'MarkdownLoaderExample.js'),
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(gif|jpg|png)$/,
        use: 'file-loader',
      },
      {
        test: /\.md$/,
        use: path.resolve(__dirname, '..'),
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin()],
}
