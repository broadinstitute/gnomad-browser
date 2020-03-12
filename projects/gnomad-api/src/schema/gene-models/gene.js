import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { isEmpty } from 'lodash'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'
import { UserVisibleError } from '../errors'

import { ExonType } from './exon'
import { ReferenceGenomeType } from './referenceGenome'

export const GeneType = new GraphQLObjectType({
  name: 'Gene',
  fields: {
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
    gene_version: { type: new GraphQLNonNull(GraphQLString) },
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

export const shapeGene = (gene, referenceGenome) => {
  const gencodeData =
    gene.gencode[
      referenceGenome === 'GRCh37'
        ? process.env.GRCH37_GENCODE_VERSION || 'v19'
        : process.env.GRCH38_GENCODE_VERSION || 'v29'
    ]

  if (isEmpty(gencodeData)) {
    throw new UserVisibleError('Gene not found')
  }

  return {
    reference_genome: referenceGenome,
    gene_id: gene.gene_id,
    gene_version: gencodeData.gene_version,
    symbol: gene.symbol,
    hgnc_id: gene.hgnc_id,
    name: gene.name,
    chrom: gencodeData.chrom,
    start: gencodeData.start,
    stop: gencodeData.stop,
    exons: gencodeData.exons,
    strand: gencodeData.strand,
    transcripts: gencodeData.transcripts.map(transcript => ({
      ...transcript,
      reference_genome: referenceGenome,
    })),
    canonical_transcript_id: gencodeData.canonical_transcript_id,
    omim_id: gene.omim_id,
  }
}

export const fetchGeneById = async (ctx, geneId, referenceGenome) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'genes',
      type: 'documents',
      id: geneId,
    })

    return shapeGene(response._source, referenceGenome)
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('Gene not found')
    }
    throw err
  }
}

export const fetchGeneBySymbol = async (ctx, geneSymbol, referenceGenome) => {
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

  return shapeGene(response.hits.hits[0]._source, referenceGenome)
}

export const fetchGenesByRegion = async (ctx, region) => {
  const { reference_genome: referenceGenome, xstart, xstop } = region
  const gencodeVersion =
    referenceGenome === 'GRCh37'
      ? process.env.GRCH37_GENCODE_VERSION || 'v19'
      : process.env.GRCH38_GENCODE_VERSION || 'v29'

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
                [`gencode.${gencodeVersion}.xstart`]: {
                  lte: xstop,
                },
              },
            },
            {
              range: {
                [`gencode.${gencodeVersion}.xstop`]: {
                  gte: xstart,
                },
              },
            },
          ],
        },
      },
    },
  })

  return hits.map(hit => shapeGene(hit._source, referenceGenome))
}
