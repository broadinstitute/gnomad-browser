import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'
import { UserVisibleError } from '../errors'

import { ExonType } from './exon'
import { ReferenceGenomeType } from './referenceGenome'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    symbol: { type: new GraphQLNonNull(GraphQLString) },
    hgnc_id: { type: GraphQLString },
    name: { type: GraphQLString },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    exons: { type: new GraphQLNonNull(new GraphQLList(ExonType)) },
    strand: { type: new GraphQLNonNull(GraphQLString) },
    canonical_transcript_id: { type: GraphQLString },
    omim_id: { type: GraphQLString },

    // Deprecated fields
    // TODO: Remove these fields
    gene_name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: obj => obj.symbol,
    },
    full_gene_name: {
      type: GraphQLString,
      resolve: obj => obj.name,
    },
  },
})

export const shapeGene = gene => {
  const gencodeData = gene.gencode.v19

  return {
    reference_genome: 'GRCh37',
    gene_id: gene.gene_id,
    symbol: gene.symbol,
    hgnc_id: gene.hgnc_id,
    name: gene.name,
    chrom: gencodeData.chrom,
    start: gencodeData.start,
    stop: gencodeData.stop,
    exons: gencodeData.exons,
    strand: gencodeData.strand,
    transcripts: gencodeData.transcripts,
    canonical_transcript_id: gencodeData.canonical_transcript_id,
    omim_id: gene.omim_id,
  }
}

export const fetchGeneById = async (ctx, geneId) => {
  const response = await ctx.database.elastic.get({
    index: 'genes',
    type: 'documents',
    id: geneId,
  })

  if (!response.found) {
    throw new UserVisibleError('Gene not found')
  }

  return shapeGene(response._source)
}

export const fetchGeneBySymbol = async (ctx, geneSymbol) => {
  const response = await ctx.database.elastic.search({
    index: 'genes',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: { term: { symbol_upper_case: geneSymbol.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  if (response.hits.total === 0) {
    throw new UserVisibleError('Gene not found')
  }

  return shapeGene(response.hits.hits[0]._source)
}

export const fetchGenesByRegion = async (ctx, { xstart, xstop }) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'genes',
    type: 'documents',
    size: 200,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                'gencode.v19.xstart': {
                  lte: xstop,
                },
              },
            },
            {
              range: {
                'gencode.v19.xstop': {
                  gte: xstart,
                },
              },
            },
          ],
        },
      },
    },
  })

  return hits.map(hit => shapeGene(hit._source))
}
