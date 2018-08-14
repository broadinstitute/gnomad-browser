// @flow
import path from 'path'

import {
  filePaths,
  md2html,
  writeHtml,
  compile,
  prepareDocumentForElastic,
} from './index'


const mdDirectory = path.resolve(
  __dirname,
  '../example/testMd'
)
const htmlDirectory = path.resolve(
  __dirname,
  '../example/testHtml'
)

describe('filePaths', () => {
  it(`given an absolute path to a directory,
     returns an array of file paths matching extension`, (done) => {
      filePaths(mdDirectory, '.md')
        .then((paths) => {
          expect(path.basename(paths[0])).toBe(
            'ancestry.md'
          )
          done()
        })
        .catch(error => console.log(error))
    })
})

describe('md2html', () => {
  it('given an absolute file path to a markdown file, returns html string', (done) => {
    const config = {
      mdDirectory,
      htmlDirectory,
    }
    const simpleTestPath = path.join(__dirname, '../example/testMd/simpleTest.md')
    md2html(config, simpleTestPath).then((result) => {
      expect(result.htmlString).toBe('<p>I am using <strong>markdown</strong>.</p>\n')
      expect(result.filename).toBe('simpleTest')
      done()
    })
  })
})

describe('writeHtml', () => {
  it('given html string, write to specify directory, return the new file\'s path', (done) => {
    const htmlString = '<p>I am using <strong>markdown</strong>.</p>\n'
    const fileData = {
      htmlString,
      filename: 'simpleTest',
      htmlWriteDirectory: htmlDirectory,
    }
    writeHtml(fileData)
      .then((data) => {
        expect(data.htmlFilePath).toBe(path.join(htmlDirectory, 'simpleTest.html'))
        done()
      })
  })
})

describe('compile', () => {
  it('given a configuration file, compiles md to html', (done) => {
    const options = {
      mdReadDirectory: mdDirectory,
      htmlWriteDirectory: htmlDirectory,
      filterSettings: { onlyPublic: false }
    }
    compile(options)
      .then((results) => {
        expect(results).toHaveLength(3)
        done()
      })
  })
})

describe('writeHtml', () => {
  it('given html string, write to specify directory, return the new file\'s path', (done) => {
    const htmlString = '<p>I am using <strong>markdown</strong>.</p>\n'
    const fileData = {
      htmlString,
      filename: 'simpleTest',
      htmlWriteDirectory: htmlDirectory,
    }
    writeHtml(fileData)
      .then((data) => {
        expect(data.htmlFilePath).toBe(path.join(htmlDirectory, 'simpleTest.html'))
        done()
      })
  })
})

describe('prepareDocumentForElastic.', () => {
  it('Converts remark output to format suitable for elasticsearch loading.', (done) => {
    const config = {
      mdDirectory,
      htmlDirectory,
    }
    const filePath = path.join(__dirname, '../example/testMd/randomForest.md')
    md2html(config, filePath).then((result) => {
      const elasticDocument = prepareDocumentForElastic(result)
      expect(Object.keys(elasticDocument)).toEqual(
        ['vcfkey', 'title', 'index', 'created', 'modified', 'htmlString', 'id']
      )

      done()
    })
  })
})
