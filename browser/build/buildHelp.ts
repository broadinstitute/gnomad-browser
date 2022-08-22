#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const glob = require('glob')
const prettier = require('prettier')

const OUTPUT_PATH = path.resolve(__dirname, '../src/help/helpTopics.js')

const sourceFilePaths = (subsectionName: string, filenamePattern: string) => {
  const subsectionPath = path.resolve(__dirname, `../help/${subsectionName}`)
  const globPattern = `${subsectionPath}/**/${filenamePattern}`
  return glob
    .sync(globPattern, {
      matchBase: true,
      absolute: true,
    })
    .filter((sourceFilePath: string) => !sourceFilePath.match(/\.spec\./))
}

const helpTopicFiles = sourceFilePaths('topics', '*.md')
const faqFiles = sourceFilePaths('faq', '*.@(js|tsx|md)')

const helpImports = helpTopicFiles
  .map((f: string, i: number) => {
    let importPath = path.relative(path.dirname(OUTPUT_PATH), f)
    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`
    }

    return `import topic${i} from '${importPath}'`
  })
  .join(';')

const helpTopics = `
  const topics = [${helpTopicFiles.map((_: any, i: number) => `topic${i}`).join(',')}];
`

const faqImports = faqFiles
  .map((f: string, i: number) => {
    const importPath = path.relative(path.dirname(OUTPUT_PATH), f)
    if (f.endsWith('.js') || f.endsWith('.tsx')) {
      return `import * as faqEntry${i} from '${importPath.replace(/\.(js|tsx)$/, '')}'`
    }

    return `import faqEntry${i} from '${importPath}'`
  })
  .join(';')

const faqEntries = `
  const faqEntries = [${faqFiles
    .map((f: string, i: number) => {
      const id = path.basename(f).replace(/\.(js|tsx|md)$/, '')
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
