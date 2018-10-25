import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const geneCountsFilePath = '/Users/msolomon/Data/schizophrenia/171211/2017-10-15-schema-single-gene-burden-results.txt'

const geneCountsHeaders = [
  'gene_name',
  'description',
  'gene_id',
  'case_lof',
  'ctrl_lof',
  'pval_lof',
  'case_mpc',
  'ctrl_mpc',
  'pval_mpc',
  'pval_meta',
]

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: true,
  filePath: geneCountsFilePath,
  headers: geneCountsHeaders,
  delimiter: '\t',
  indexName: 'schizophrenia_gene_results_171214',
  typeName: 'result',
}

loadCsvToElastic(config)
