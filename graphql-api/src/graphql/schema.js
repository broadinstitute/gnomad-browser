const path = require('path')

const { loadFilesSync } = require('@graphql-tools/load-files')
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge')
const { makeExecutableSchema } = require('@graphql-tools/schema')

const aliasResolvers = require('./resolvers/aliases')
const browserMetadataResolvers = require('./resolvers/browser-metadata')
const clinVarVariantResolvers = require('./resolvers/clinvar-variants')
const coverageResolvers = require('./resolvers/coverage')
const geneResolvers = require('./resolvers/gene')
const geneFieldResolvers = require('./resolvers/gene-fields')
const mitochondrialCoverageResolvers = require('./resolvers/mitochondrial-coverage')
const mitochondrialVariantResolvers = require('./resolvers/mitochondrial-variants')
const multiNucleotideVariantResolves = require('./resolvers/multi-nucleotide-variants')
const regionResolvers = require('./resolvers/region')
const regionFieldResolvers = require('./resolvers/region-fields')
const searchResolvers = require('./resolvers/search')
const structuralVariantResolvers = require('./resolvers/structural-variants')
const transcriptResolvers = require('./resolvers/transcript')
const transcriptFieldResolvers = require('./resolvers/transcript-fields')
const variantResolvers = require('./resolvers/variants')

const typeDefs = mergeTypeDefs([
  ...loadFilesSync(path.join(__dirname, './types')),
  'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
])

const resolvers = mergeResolvers([
  aliasResolvers,
  browserMetadataResolvers,
  clinVarVariantResolvers,
  coverageResolvers,
  geneResolvers,
  geneFieldResolvers,
  mitochondrialCoverageResolvers,
  mitochondrialVariantResolvers,
  multiNucleotideVariantResolves,
  regionResolvers,
  regionFieldResolvers,
  searchResolvers,
  structuralVariantResolvers,
  transcriptResolvers,
  transcriptFieldResolvers,
  variantResolvers,
])

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

module.exports = schema
