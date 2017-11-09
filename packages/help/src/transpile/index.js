// @flow
import FileQueue from 'filequeue'
import fs from 'fs'
import R from 'ramda'
import remark from 'remark'
import html from 'remark-html'
import toc from 'remark-toc'
import hljs from 'remark-highlight.js'
import metaPlugIn from 'remark-yaml-meta'
import path from 'path'
import glob from 'glob'
import { v4 } from 'node-uuid'
import moment from 'moment'

import { loadJsonArrayToElastic } from '@broad/api/utilities/elasticsearch'

// Max number of files open at once
const fq = new FileQueue(100)

export const filePaths = (
  directory: string,
  extension: string,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    glob(
      `${directory}/*${extension}`,
      (error, paths) => {
        if (error) {
          reject(error)
        }
        resolve(paths)
      })
  })
}

export const fileStats = (filePath: string): {
  created: number,
  modified: number,
  stats: Object,
} => {
  const stats = fs.statSync(filePath)
  const { mtime, birthtime } = stats
  return {
    created: birthtime,
    modified: mtime,
    stats,
  }
}

export const md2html = R.curry((
  config: {
    mdReadDirectory: string,
    mdWriteDirectory: string,
    htmlWriteDirectory: string,
    defaultFrontmatter: {
      type: string,
      public: boolean
    }
  },
  file: string,
): Promise<{
  htmlString: string,
  filename: string,
  mdFilePath: string,
  metadata: Object,
  id: string,
}> => {
  return new Promise((resolve, reject) => {
    fq.readFile(file, 'utf-8', (error, data) => {
      const {
        mdReadDirectory,
        mdWriteDirectory,
        htmlWriteDirectory,
        defaultFrontmatter,
      } = config

      if (error) reject(error)
      const vfile = remark().use(metaPlugIn).process(data, (e, f) => {
        // console.log(f)
      })
      const frontmatter = vfile || defaultFrontmatter
      const mdString = remark().use([
        toc,
        hljs,
      ]).process(data).toString()
      const htmlString = remark().use([
        toc,
        html,
        hljs,
      ]).process(data).toString()
      const final = {
        frontmatter,
        mdReadDirectory,
        mdWriteDirectory,
        mdString,
        htmlWriteDirectory,
        htmlString,
        mdFilePath: file,
        filename: path.basename(file, '.md'),
        metadata: fileStats(file),
        id: v4(),
      }
      resolve(final)
    })
  })
})

export const filterDocuments = (doc, filterSettings) => {
  if (!doc.frontmatter.meta) {
    return false
  }
  if (filterSettings.onlyPublic && doc.frontmatter.public) {
    return true
  }
  if (!filterSettings.onlyPublic) {
    return true
  }
  return true
}

export const writeHtml = (
  fileData: {
    mdString: string,
    // mdWriteDirectory: string,
    htmlString: string,
    htmlWriteDirectory: string,
    filename: string
  },
): Promise<{
  htmlFilePath: string,
}> => {
  return new Promise((resolve, reject) => {
    const { htmlString, filename, htmlWriteDirectory } = fileData
    const htmlFilePath = path.join(htmlWriteDirectory, `${filename}.html`)
    // const mdWriteFilePath = path.join(mdWriteDirectory, `${filename}.md`)
    // fq.writeFile(mdWriteFilePath, mdString, (error) => {
    //   if (error) {
    //     console.log(error)
    //   }
    // })
    fq.writeFile(htmlFilePath, htmlString, (error, outputFilePath) => {
      if (error) {
        console.log(error)
        reject('hello', error)
      }
      resolve({
        ...fileData,
        htmlFilePath,
      })
    })
  })
}

export const compile = (config: {
  mdReadDirectory: string,
  htmlWriteDirectory: string,
  filterSettings: {
    type: string,
    onlyPublic: boolean,
  }
}) => {
  return new Promise((resolve, reject) => {
    const { mdReadDirectory, filterSettings } = config
    filePaths(mdReadDirectory, '.md')
      .then(pathList => pathList.map(md2html(config)))
      .then(promiseArray => Promise.all(promiseArray))
      .then((resolvedArray) => {
        return resolvedArray
          .filter(doc => filterDocuments(doc, filterSettings))
          .map(writeHtml)
      })
      .then(promiseArray => Promise.all(promiseArray))
      .then(resolve)
      .catch((error) => {
        console.log(error)
        return reject(error)
      })
  })
}

export const prepareDocumentForElastic = (document) => {
  const {
    filename,
    metadata: {
      created,
      modified,
    },
    frontmatter: {
      meta: {
        vcfkey,
        title,
        index,
      }
    },
    htmlString,
  } = document
  const elasticDocument = {
    vcfkey,
    title,
    index,
    created,
    modified,
    htmlString,
    id: filename,
  }
  return elasticDocument
}

export const batchLoadDocumentsToElastic = (config: {
  mdReadDirectory: string,
  htmlWriteDirectory: string,
  filterSettings: {
    type: string,
    onlyPublic: boolean,
  },
  elasticSettings: {
    address: string,
    dropPreviousIndex: boolean,
    indexName: string,
    typeName: string,
  }
}) => {
  return new Promise((resolve, reject) => {
    const { mdReadDirectory, filterSettings } = config
    filePaths(mdReadDirectory, '.md')
      .then(pathList => pathList.map(md2html(config)))
      .then(promiseArray => Promise.all(promiseArray))
      .then((resolvedArray) => {
        return resolvedArray
          .filter(doc => filterDocuments(doc, filterSettings))
          .map(prepareDocumentForElastic)
      })
      .then((promiseArray) => Promise.all(promiseArray))
      .then((jsonArray) => {
        loadJsonArrayToElastic({ ...config.elasticSettings, jsonArray })
        resolve(jsonArray)
      })
      .catch((error) => {
        console.log(error)
        return reject(error)
      })
  })
}
