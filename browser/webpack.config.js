const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const { EnvironmentPlugin } = require('webpack')
const tsConfig = require('../tsconfig.build.json')

const isDev = process.env.NODE_ENV === 'development'

// Helper to get base URL from GNOMAD_API_URL (strips /api suffix if present)
// Force IPv4 by using 127.0.0.1 instead of localhost to avoid IPv6 connection issues
const getApiBaseUrl = () => {
  const url = process.env.GNOMAD_API_URL || 'http://localhost:8010'
  return url.replace(/\/api$/, '').replace('localhost', '127.0.0.1')
}

const gaTrackingId = process.env.GA_TRACKING_ID
if (process.env.NODE_ENV === 'production' && !gaTrackingId) {
  // eslint-disable-next-line no-console
  console.log('\nWarning: No GA tracking ID for production build\n')
}

const config = {
  devServer: {
    historyApiFallback: {
      disableDotRule: true,
    },
    hot: true,
    port: 8008,
    server: 'https',
    static: {
      publicPath: '/',
    },
    proxy: [
      // CopilotKit proxy - must come before general /api proxy
      // Don't rewrite the path since CopilotKit is mounted at /api/copilotkit on the API server
      {
        context: '/api/copilotkit',
        target: getApiBaseUrl(),
        changeOrigin: true,
        secure: false,
      },
      // General API proxy - pass through as-is (API is mounted at /api/ on the server)
      {
        context: '/api',
        target: getApiBaseUrl(),
        changeOrigin: true,
        secure: false,
      },
      {
        context: '/reads',
        target: process.env.READS_API_URL,
        pathRewrite: { '^/reads': '' },
        changeOrigin: true,
        secure: false,
      },
    ],
  },
  devtool: 'source-map',
  entry: {
    bundle: path.resolve(__dirname, './src/index.tsx'),
  },
  mode: isDev ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2015',
          tsconfigRaw: tsConfig,
        },
      },
      {
        test: /\.(j)sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              rootMode: 'upward',
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
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  output: {
    path: path.resolve(__dirname, './dist/public'),
    publicPath: '/',
    filename: isDev ? 'js/[name].js' : 'js/[name]-[contenthash].js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [path.resolve(__dirname, './src/opensearch.xml')],
    }),
    new CopyWebpackPlugin({
      patterns: [path.resolve(__dirname, './src/robots.txt')],
    }),
    new EnvironmentPlugin({
      REPORT_VARIANT_URL: null,
      REPORT_VARIANT_VARIANT_ID_PARAMETER: null,
      REPORT_VARIANT_DATASET_PARAMETER: null,
      // Add these new variables for Auth0
      REACT_APP_AUTH0_ENABLE: null,
      REACT_APP_AUTH0_DOMAIN: null,
      REACT_APP_AUTH0_CLIENT_ID: null,
      REACT_APP_AUTH0_AUDIENCE: null,
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
    new FaviconsWebpackPlugin('./src/logo.svg'),
  ],
  // Use browserslist queries from .browserslistrc
  // Set to web in development as workaround for https://github.com/webpack/webpack-dev-server/issues/2758
  target: isDev ? 'web' : 'browserslist',
}

module.exports = config
