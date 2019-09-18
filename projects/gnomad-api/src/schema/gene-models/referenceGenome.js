import { GraphQLEnumType } from 'graphql'

export const ReferenceGenomeType = new GraphQLEnumType({
  name: 'ReferenceGenome',
  values: {
    GRCh37: {},
    GRCh38: {},
  },
})
