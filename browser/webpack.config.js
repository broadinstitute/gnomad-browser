const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')

const isDev = process.env.NODE_ENV === 'development'
const extraResolveOptions = isDev
  ? {
      alias: {
        'react-dom': '@hot-loader/react-dom',
      },
    }
  : {}

const gaTrackingId = process.env.GA_TRACKING_ID
if (process.env.NODE_ENV === 'production' && !gaTrackingId) {
  // eslint-disable-next-line no-console
  console.log('\nWarning: No GA tracking ID for production build\n')
}

const config = {
  devServer: {
    historyApiFallback: true,
    hot: true,
    port: 8008,
    publicPath: '/',
    stats: 'errors-only',
    proxy: {
      '/api': {
        target: process.env.GNOMAD_API_URL,
        pathRewrite: { '^/api': '' },
        changeOrigin: true,
      },
      '/reads': {
        target: process.env.READS_API_URL,
        pathRewrite: { '^/reads': '' },
        changeOrigin: true,
      },
    },
  },
  devtool: 'source-map',
  entry: {
    bundle: path.resolve(__dirname, './src/index.tsx'),
  },
  mode: isDev ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              rootMode: 'upward',
            },
          },
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.build.json',
            },
          },
        ],
      },
      {
        test: /\.(pdf|gif|jpg|png|svg)$/,
        use: {
          loader: 'file-loader',
          options: {
            outputPath: 'assets/images',
          },
        },
      },
      {
        test: /\.md$/,
        use: {
          loader: '@gnomad/markdown-loader',
        },
      },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'], ...extraResolveOptions },
  output: {
    path: path.resolve(__dirname, './dist/public'),
    publicPath: '/',
    filename: isDev ? 'js/[name].js' : 'js/[name]-[contenthash].js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [path.resolve(__dirname, './src/opensearch.xml')],
    }),
    new EnvironmentPlugin({
      REPORT_VARIANT_URL: null,
      REPORT_VARIANT_VARIANT_ID_PARAMETER: null,
      REPORT_VARIANT_DATASET_PARAMETER: null,
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      gaTrackingId: process.env.GA_TRACKING_ID,
      minify: isDev
        ? false
        : {
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          },
    }),
  ],
  // Use browserslist queries from .browserslistrc
  // Set to web in development as workaround for https://github.com/webpack/webpack-dev-server/issues/2758
  target: isDev ? 'web' : 'browserslist',
}

module.exports = config
