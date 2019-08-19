import { GraphQLObjectType } from 'graphql'

export const extendObjectType = (type, config) => {
  const typeConfig = type.toConfig()

  return new GraphQLObjectType({
    ...typeConfig,
    fields: {
      ...typeConfig.fields,
      ...config.fields,
    },
  })
}
