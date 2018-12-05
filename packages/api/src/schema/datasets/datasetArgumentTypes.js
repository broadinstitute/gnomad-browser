import { GraphQLEnumType } from 'graphql'

import datasetsConfig from './datasetsConfig'

export const AnyDatasetArgumentType = new GraphQLEnumType({
  name: 'DatasetId',
  values: Object.keys(datasetsConfig).reduce(
    (values, datasetId) => ({ ...values, [datasetId]: {} }),
    {}
  ),
})

const methodSpecificArgumentTypes = {}

export const datasetArgumentTypeForMethod = methodName => {
  if (!methodSpecificArgumentTypes[methodName]) {
    const typeName = `DatasetsSupporting${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`
    const type = new GraphQLEnumType({
      name: typeName,
      values: Object.keys(datasetsConfig)
        .filter(datasetId => datasetsConfig[datasetId][methodName] !== undefined)
        .reduce((values, datasetId) => ({ ...values, [datasetId]: {} }), {}),
    })
    methodSpecificArgumentTypes[methodName] = type
  }
  return methodSpecificArgumentTypes[methodName]
}
