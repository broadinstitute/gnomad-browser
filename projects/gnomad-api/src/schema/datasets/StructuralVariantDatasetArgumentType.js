import { GraphQLEnumType } from 'graphql'

import svDatasets from './svDatasets'

const StructuralVariantDatasetArgumentType = new GraphQLEnumType({
  name: 'StructuralVariantDatasetId',
  values: Object.keys(svDatasets).reduce(
    (values, datasetId) => ({ ...values, [datasetId]: {} }),
    {}
  ),
})

export default StructuralVariantDatasetArgumentType
