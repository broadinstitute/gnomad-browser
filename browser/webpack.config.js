const fs = require('fs')
const path = require('path')

const glob = require('glob')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isDev = process.env.NODE_ENV === 'development'

const gaTrackingId = process.env.GA_TRACKING_ID
if (process.env.NODE_ENV === 'production' && !gaTrackingId) {
  // eslint-disable-next-line no-console
  console.log('\nWarning: No GA tracking ID for production build\n')
}

// Generate help topics
const helpContentDirectory = path.resolve(__dirname, './src/help/content')
const helpTopicsModulePath = path.resolve(__dirname, './src/help/helpTopics.js')
const helpFiles = glob.sync('*.md', {
  cwd: helpContentDirectory,
  matchBase: true,
  absolute: true,
})

const helpTopicsModuleContent = [
  helpFiles
    .map((f, i) => {
      let importPath = path.relative(path.dirname(helpTopicsModulePath), f)
      if (!importPath.startsWith('.')) {
        importPath = `./${importPath}`
      }

      return `import helpTopic${i} from '${importPath}'`
    })
    .join('\n'),
  '\nconst helpTopics = [',
  helpFiles.map((f, i) => `  helpTopic${i},`).join('\n'),
  ']\n',
  'export default helpTopics.reduce((acc, topic) => ({ ...acc, [topic.id.toLowerCase()]: topic }), {})\n',
].join('\n')

fs.writeFileSync(helpTopicsModulePath, helpTopicsModuleContent)

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
    bundle: path.resolve(__dirname, './src/index.js'),
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
        test: /\.(gif|jpg|png|svg)$/,
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
  output: {
    path: path.resolve(__dirname, './dist/public'),
    publicPath: '/',
    filename: isDev ? '[name].js' : '[name]-[contenthash].js',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [path.resolve(__dirname, './src/opensearch.xml')],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      gaTrackingId: process.env.GA_TRACKING_ID,
    }),
  ],
}

if (isDev) {
  config.resolve = {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  }
}

module.exports = config
