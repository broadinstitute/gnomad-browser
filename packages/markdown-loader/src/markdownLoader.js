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
      node.url = `___MD_CONTENT_IMAGE_${file.images.length - 1}___`
    }
  })
}
/* eslint-enable no-param-reassign */

module.exports = function markdownLoader(content) {
  const callback = this.async()

  remark()
    .use(frontmatter)
    .use(extract, { yaml })
    .use(imageFinder)
    .use(html)
    .process(content)
    .then(vfile => {
      let output = `export default ${JSON.stringify({
        ...vfile.data,
        html: vfile.contents,
      })};`

      const imports = []

      output = output.replace(/___MD_CONTENT_IMAGE_([0-9]+)___/g, (match, p1) => {
        const imageIndex = parseInt(p1, 10)
        const request = loaderUtils.stringifyRequest(
          this,
          loaderUtils.urlToRequest(vfile.images[imageIndex])
        )
        imports.push(`import ___MD_CONTENT_IMAGE_${imageIndex}__ from ${request}`)

        return `" + ___MD_CONTENT_IMAGE_${imageIndex}__ + "`
      })

      if (imports.length > 0) {
        output = `${imports.join(';')};${output}`
      }

      callback(null, output)
    }, callback)
}
