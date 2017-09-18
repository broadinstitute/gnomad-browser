import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const geneCountsFilePath = '../../../resources/gene_counts_results.txt'

const geneCountsHeaders = [
  'geneName',
  'dnmLof',
  'caseLof',
  'ctrlLof',
  'caseMis',
  'ctrlMis',
  'pCaco',
  'pMeta',
]

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: true,
  filePath: geneCountsFilePath,
  headers: geneCountsHeaders,
  delimiter: '\t',
  indexName: 'schizophrenia_gene_results',
  typeName: 'result',
}

loadCsvToElastic(config)