const path = require('path')

const browserDir = path.resolve(__dirname, '../browsers', process.env.BROWSER)

// eslint-disable-next-line import/no-dynamic-require
const browserConfig = require(path.join(browserDir, 'config'))

const aliases = {
  '@browser-components': path.join(browserDir, 'components'),
}

const definitions = {
  BROWSER_CONFIG: JSON.stringify(browserConfig),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
}

module.exports = {
  aliases,
  browserConfig,
  definitions,
}
