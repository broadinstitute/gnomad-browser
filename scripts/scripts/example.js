const Webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const webpackConfig = require('../example-server/webpack.config')

webpackConfig.resolve.alias['example-component'] = `${process.cwd()}/example/index.js`

const compiler = Webpack(webpackConfig)
const server = new WebpackDevServer(compiler, webpackConfig.devServer)

server.listen(webpackConfig.devServer.port)
