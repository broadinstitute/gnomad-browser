const path = require('path')

const { loadFilesSync } = require('@graphql-tools/load-files')
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge')
const { makeExecutableSchema } = require('@graphql-tools/schema')

const aliasResolvers = require('./resolvers/aliases')
const browserMetadataResolvers = require('./resolvers/browser-metadata')
const clinVarVariantResolvers = require('./resolvers/clinvar-variants')
const clinVarVariantFieldResolvers = require('./resolvers/clinvar-variant-fields')
const coverageResolvers = require('./resolvers/coverage')
const geneResolvers = require('./resolvers/gene')
const geneFieldResolvers = require('./resolvers/gene-fields')
const liftoverResolvers = require('./resolvers/liftover')
const mitochondrialCoverageResolvers = require('./resolvers/mitochondrial-coverage')
const mitochondrialVariantResolvers = require('./resolvers/mitochondrial-variants')
const multiNucleotideVariantResolves = require('./resolvers/multi-nucleotide-variants')
const regionResolvers = require('./resolvers/region')
const regionFieldResolvers = require('./resolvers/region-fields')
const shortTandemRepeatResolvers = require('./resolvers/short-tandem-repeats')
const structuralVariantResolvers = require('./resolvers/structural-variants')
const transcriptResolvers = require('./resolvers/transcript')
const transcriptFieldResolvers = require('./resolvers/transcript-fields')
const variantResolvers = require('./resolvers/variants')
const variantFieldResolvers = require('./resolvers/variant-fields')
const variantCooccurrenceResolvers = require('./resolvers/variant-cooccurrence')

const typeDefs = mergeTypeDefs([
  ...loadFilesSync(path.join(__dirname, './types')),
  'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
])

const resolvers = mergeResolvers([
  aliasResolvers,
  browserMetadataResolvers,
  clinVarVariantResolvers,
  clinVarVariantFieldResolvers,
  coverageResolvers,
  geneResolvers,
  geneFieldResolvers,
  liftoverResolvers,
  mitochondrialCoverageResolvers,
  mitochondrialVariantResolvers,
  multiNucleotideVariantResolves,
  regionResolvers,
  regionFieldResolvers,
  shortTandemRepeatResolvers,
  structuralVariantResolvers,
  transcriptResolvers,
  transcriptFieldResolvers,
  variantResolvers,
  variantFieldResolvers,
  variantCooccurrenceResolvers,
])

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

module.exports = schema
