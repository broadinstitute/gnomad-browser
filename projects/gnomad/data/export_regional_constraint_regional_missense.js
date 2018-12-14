import { loadCsvToElastic } from './elasticsearch'
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

// http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/regional_constraint/regional_missense/_search

