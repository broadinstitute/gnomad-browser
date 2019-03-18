const path = require('path')

const loaderUtils = require('loader-utils')
const remark = require('remark')
const extract = require('remark-extract-frontmatter')
const frontmatter = require('remark-frontmatter')
const html = require('remark-html')
const visit = require('unist-util-visit')
const yaml = require('yaml').parse

/* eslint-disable no-param-reassign */
const imageFinder = () => (tree, file) => {
  file.images = []
  visit(tree, 'image', node => {
    if (!node.url.startsWith('http')) {
      file.images.push(node.url)
      node.url = `___HELP_CONTENT_IMAGE_${file.images.length - 1}___`
    }
  })
}
/* eslint-enable no-param-reassign */

module.exports = function helpFileLoader(content) {
  const callback = this.async()

  const { directory } = loaderUtils.getOptions(this)
  const topicId = path.relative(directory, this.resource).replace(/\.md$/, '')

  remark()
    .use(frontmatter)
    .use(extract, { yaml })
    .use(imageFinder)
    .use(html)
    .process(content)
    .then(vfile => {
      let output = `module.exports = ${JSON.stringify({
        id: topicId,
        title: vfile.data.title,
        content: vfile.contents,
      })}`

      output = output.replace(/___HELP_CONTENT_IMAGE_([0-9]+)___/g, (match, p1) => {
        const imageIndex = parseInt(p1, 10)
        const request = loaderUtils.stringifyRequest(
          this,
          loaderUtils.urlToRequest(vfile.images[imageIndex])
        )
        return `" + require(${request}) + "`
      })

      callback(null, output)
    }, callback)
}
