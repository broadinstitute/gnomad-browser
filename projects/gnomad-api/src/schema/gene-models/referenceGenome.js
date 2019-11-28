import { GraphQLEnumType } from 'graphql'

export const ReferenceGenomeType = new GraphQLEnumType({
  name: 'ReferenceGenomeId',
  values: {
    GRCh37: {},
    GRCh38: {},
  },
})
