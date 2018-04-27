import { loadCsvToElastic } from '@broad/api/utilities/elasticsearch'
import regionalMissenseMapping from './regional_missense_mapping.json'

const filePath = '../../../resources/fordist_constraint_official_regional_missense_cleaned_metrics_nosynoutliers.txt'

const config = {
  address: '23.236.50.46:9200',
  dropPreviousIndex: true,
  filePath,
  delimiter: '\t',
  indexName: 'regional_missense',
  typeName: 'region',
  mapping: regionalMissenseMapping,
}

loadCsvToElastic(config)

// http://elastic:9200/regional_constraint/regional_missense/_search

