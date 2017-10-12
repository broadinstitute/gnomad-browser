import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const filePath = '../../../resources/fordist_constraint_official_fullgene_cleaned_missense_metrics_nosynoutliers.txt'

const headers = [
  'transcript',
  'gene',
  'chr',
  'n_coding_exons',
  'cds_start',
  'cds_end',
  'bp',
  'amino_acids',
  'low_depth_exons',
  'obs_mis',
  'exp_mis',
  'obs_exp',
  'overall_chisq',
  'n_regions'
]

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: true,
  filePath,
  headers,
  delimiter: '\t',
  indexName: 'regional_constraint_full_gene',
  typeName: 'gene',
}

loadCsvToElastic(config)

// http://elastic:9200/regional_constraint/gene_stats/_search
