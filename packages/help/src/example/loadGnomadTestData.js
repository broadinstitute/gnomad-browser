import path from 'path'
import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const filePath = path.join(__dirname, 'gnomadHelp.csv')

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: false,
  filePath,
  headers: ['vcfkey', 'topic', 'description'],
  delimiter: ',',
  indexName: 'gnomad_help',
  typeName: 'entry',
}

loadCsvToElastic(config)
