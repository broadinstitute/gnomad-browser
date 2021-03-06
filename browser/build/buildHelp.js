#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const glob = require('glob')
const prettier = require('prettier')

const OUTPUT_PATH = path.resolve(__dirname, '../src/help/helpTopics.js')

const helpTopicFiles = glob.sync(`${path.resolve(__dirname, '../help/topics')}/**/*.md`, {
  matchBase: true,
  absolute: true,
})

const helpImports = helpTopicFiles
  .map((f, i) => {
    let importPath = path.relative(path.dirname(OUTPUT_PATH), f)
    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`
    }

    return `import topic${i} from '${importPath}'`
  })
  .join(';')

const helpTopics = `
  const topics = [${helpTopicFiles.map((_, i) => `topic${i}`).join(',')}];
`

const faqFiles = glob.sync(`${path.resolve(__dirname, '../help/faq')}/**/*.@(js|md)`, {
  matchBase: true,
  absolute: true,
})

const faqImports = faqFiles
  .map((f, i) => {
    const importPath = path.relative(path.dirname(OUTPUT_PATH), f)
    if (f.endsWith('.js')) {
      return `import * as faqEntry${i} from '${importPath.replace(/\.js$/, '')}'`
    }

    return `import faqEntry${i} from '${importPath}'`
  })
  .join(';')

const faqEntries = `
  const faqEntries = [${faqFiles
    .map((f, i) => {
      const id = path.basename(f).replace(/\.(js|md)$/, '')
      return `{id: '${id}', ...faqEntry${i}}`
    })
    .join(',')}];
`

const content = `
  import React from 'react';

  ${helpImports};
  ${faqImports};

  import MarkdownContent from '../MarkdownContent';

  ${helpTopics};
  ${faqEntries};

  export const indexTexts = [
    ...topics.map(t => ({ id: t.id.toLowerCase(), texts: [t.title, t.html] })),
    ...faqEntries.map(e => ({
      id: e.id,
      texts: e.html ? [e.question, e.html] : [e.question],
    }))
  ];

  export default [
    ...topics.map(t => ({ id: t.id.toLowerCase(), title: t.title, render: () => <MarkdownContent dangerouslySetInnerHTML={{ __html: t.html }} /> })),
    ...faqEntries.map(e => ({
      id: e.id,
      title: e.question,
      render: e.renderAnswer ? e.renderAnswer : () => <MarkdownContent dangerouslySetInnerHTML={{ __html: e.html }} />,
    }))
  ].reduce((acc, e) => ({ ...acc, [e.id]: e }), {});
`

fs.writeFileSync(
  OUTPUT_PATH,
  prettier.format(content, { ...prettier.resolveConfig.sync(OUTPUT_PATH), filepath: OUTPUT_PATH })
)
