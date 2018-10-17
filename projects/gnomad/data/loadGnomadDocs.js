import path from 'path'

import { batchLoadDocumentsToElastic } from '../../../packages/help/src/transpile/index'

const gnomadHelpDirectory = path.join(__dirname, '../gnomad-docs/docs')

batchLoadDocumentsToElastic({
  mdReadDirectory: gnomadHelpDirectory,
  htmlWriteDirectory: '/tmp',
  filterSettings: { onlyPublic: false },
  elasticSettings: {
    address: 'localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy',
    dropPreviousIndex: true,
    indexName: 'gnomad_help',
    typeName: 'entry',
  },
})
