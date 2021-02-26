#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const glob = require('glob')

const files = glob.sync(`${path.resolve(__dirname, '../help/topics')}/**/*.md`, {
  matchBase: true,
  absolute: true,
})

const OUTPUT_PATH = path.resolve(__dirname, '../src/help/helpTopics.js')

const content = [
  files
    .map((f, i) => {
      let importPath = path.relative(path.dirname(OUTPUT_PATH), f)
      if (!importPath.startsWith('.')) {
        importPath = `./${importPath}`
      }

      return `import topic${i} from '${importPath}'`
    })
    .join('\n'),
  '\nconst topics = [',
  files.map((f, i) => `  topic${i},`).join('\n'),
  ']\n',
  'export default topics.reduce((acc, topic) => ({ ...acc, [topic.id.toLowerCase()]: topic }), {})\n',
].join('\n')

fs.writeFileSync(OUTPUT_PATH, content)
