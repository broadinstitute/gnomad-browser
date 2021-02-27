#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const glob = require('glob')
const prettier = require('prettier')

const FAQ_TABLE_OF_CONTENTS = require('../help/faq/faqTableOfContents.json')

const FAQ_PATH = path.resolve(__dirname, '../src/help/FAQPage.js')

const entryImports = []

let entryIndex = 0

const entries = FAQ_TABLE_OF_CONTENTS.map(
  section => `
  <SectionHeading id={slugify('${section.heading}')}>${section.heading}</SectionHeading>
  <dl>
    ${section.entries
      .map(entry => {
        entryIndex += 1

        const jsPath = glob.sync(
          path.join(path.resolve(__dirname, '../help/faq'), `**/${entry}.js`)
        )[0]
        if (jsPath) {
          const importPath = path.relative(path.dirname(FAQ_PATH), jsPath).replace(/\.js$/, '')
          entryImports.push(`import * as faqEntry${entryIndex} from '${importPath}'`)
          return `
            <Question id={slugify(faqEntry${entryIndex}.question)}>{faqEntry${entryIndex}.question}</Question>
            <Answer>
              {faqEntry${entryIndex}.renderAnswer()}
            </Answer>
          `
        }

        const mdPath = glob.sync(
          path.join(path.resolve(__dirname, '../help/faq'), `**/${entry}.md`)
        )[0]
        if (mdPath) {
          const importPath = path.relative(path.dirname(FAQ_PATH), mdPath)
          entryImports.push(`import faqEntry${entryIndex} from '${importPath}'`)
          return `
            <Question id={slugify(faqEntry${entryIndex}.question)}>{faqEntry${entryIndex}.question}</Question>
            <Answer>
              <MarkdownContent dangerouslySetInnerHTML={{ __html: faqEntry${entryIndex}.html }} />
            </Answer>
          `
        }

        throw new Error(`Unable to locate source for FAQ entry "${entry}"`)
      })
      .join('\n')}
  </dl>
`
).join('\n')

const faq = `
import React from 'react'

import { PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'
import MarkdownContent from '../MarkdownContent'

import { Question, Answer, SectionHeading } from './faqStyles'

${entryImports.join('\n')}

const slugify = string =>
  string
    .toLowerCase()
    .replace(/\\s+|\\/|_|,|:|;/g, '-') // Replace spaces and special characters with -
    .replace(/[^\\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text

const FAQPage = () => (
  <InfoPage>
    <DocumentTitle title="FAQ" />
    <PageHeading>Frequently Asked Questions</PageHeading>

    ${entries}
  </InfoPage>
)

export default FAQPage
`

const prettierConfig = prettier.resolveConfig.sync(FAQ_PATH)
fs.writeFileSync(FAQ_PATH, prettier.format(faq, { ...prettierConfig, filepath: FAQ_PATH }))

const allEntries = glob
  .sync(path.join(path.resolve(__dirname, '../help/faq'), `**/*.@(js|md)`))
  .map(f => path.basename(f).replace(/\.(js|md)$/, ''))

const allEntriesSet = new Set(allEntries)
if (allEntriesSet.size !== allEntries.length) {
  // eslint-disable-next-line no-console
  console.warn(`Warning: ${allEntries.length - allEntriesSet.size} duplicate FAQ entries`)
}

const entriesNotShown = new Set(allEntries)
FAQ_TABLE_OF_CONTENTS.flatMap(section => section.entries).forEach(entry => {
  entriesNotShown.delete(entry)
})
if (entriesNotShown.size > 0) {
  // eslint-disable-next-line no-console
  console.warn(
    `Warning: ${entriesNotShown.size} FAQ entries not shown on page: ${Array.from(
      entriesNotShown
    ).join(', ')}`
  )
}
