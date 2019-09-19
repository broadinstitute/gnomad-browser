import { GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

export const RegionType = new GraphQLObjectType({
  name: 'Region',
  fields: {
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

const allChromosomes = [...Array.from(new Array(22), (x, i) => `${i + 1}`), 'X', 'Y', 'M']
const chromosomeNumbers = allChromosomes.reduce(
  (acc, chrom, i) => ({
    ...acc,
    [chrom]: i + 1,
  }),
  {}
)

const xPosition = (chrom, pos) => {
  const chromStart = chromosomeNumbers[chrom] * 1e9
  const xpos = chromStart + pos
  return xpos
}

export const resolveRegion = (ctx, { chrom, start, stop }) => {
  return {
    start,
    stop,
    chrom,
    // xstart/xstop are not queryable, but may be used by other resolvers
    xstart: xPosition(chrom, start),
    xstop: xPosition(chrom, stop),
  }
}
