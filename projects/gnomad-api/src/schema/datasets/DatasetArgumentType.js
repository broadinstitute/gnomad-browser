import { GraphQLEnumType } from 'graphql'

import datasetsConfig from './datasetsConfig'

const DatasetArgumentType = new GraphQLEnumType({
  name: 'DatasetId',
  values: Object.keys(datasetsConfig).reduce(
    (values, datasetId) => ({ ...values, [datasetId]: {} }),
    {}
  ),
})

export default DatasetArgumentType
