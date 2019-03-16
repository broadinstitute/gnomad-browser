const Module = require('module')
const path = require('path')

const glob = require('glob')
const loaderUtils = require('loader-utils')

/* eslint-disable no-underscore-dangle */
function exec(code, filename) {
  const m = new Module(filename, this)
  m.paths = Module._nodeModulePaths(this.context)
  m.filename = filename
  m._compile(code, filename)
  return m.exports
}
/* eslint-enable no-underscore-dangle */

module.exports = function helpDirectoryLoader(content) {
  const callback = this.async()

  const config = exec.call(this, content, this.resource)
  const resourceDirectory = path.dirname(this.resource)
  const helpDirectory = path.resolve(resourceDirectory, config.directory)

  glob(`${helpDirectory}/**/*.md`, (err, files) => {
    if (err) {
      callback(err)
    }

    const requests = files.map(f =>
      loaderUtils.stringifyRequest(
        this,
        `@broad/help/src/loader/helpFileLoader?directory=${helpDirectory}!${f}`
      )
    )
    const output = `module.exports = [${requests.map(r => `require(${r})`).join(', ')}]`
    callback(null, output)
  })
}
