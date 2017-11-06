import path from 'path'
import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const filePath = path.join(__dirname, 'exampleData.csv')

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: false,
  filePath,
  headers: ['topic', 'description'],
  delimiter: ',',
  indexName: 'help_example',
  typeName: 'entry',
}

loadCsvToElastic(config)
