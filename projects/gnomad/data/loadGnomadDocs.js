import path from 'path'

import { batchLoadDocumentsToElastic } from '../../../packages/help/src/transpile/index'


const gnomadHelpDirectory = path.join(__dirname, '../gnomad-docs/docs')

batchLoadDocumentsToElastic({
  mdReadDirectory: gnomadHelpDirectory,
  htmlWriteDirectory: '/tmp',
  filterSettings: { onlyPublic: false },
  elasticSettings: {
    address: '23.236.50.46:9200',
    dropPreviousIndex: true,
    indexName: 'gnomad_help',
    typeName: 'entry',
  }
})
