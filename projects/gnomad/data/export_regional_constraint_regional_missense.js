import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'

const filePath = '../../@broad/redux-fordist_constraint_official_regional_missense_cleaned_metrics_nosynoutliers.txt'

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: false,
  filePath,
  delimiter: '\t',
  indexName: 'regional_missense',
  typeName: 'region',
}

loadCsvToElastic(config)

// http://elastic:9200/regional_constraint/regional_missense/_search

