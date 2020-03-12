import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { cloneDeep } from 'lodash'

import { UserVisibleError } from '../errors'

import { ExonType } from './exon'
import { shapeGene } from './gene'
import { ReferenceGenomeType } from './referenceGenome'

export const TranscriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: {
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    transcript_id: { type: new GraphQLNonNull(GraphQLString) },
    transcript_version: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    exons: { type: new GraphQLNonNull(new GraphQLList(ExonType)) },
    strand: { type: new GraphQLNonNull(GraphQLString) },
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const shapeTranscript = (gene, transcriptId, referenceGenome) => {
  const gencodeVersion =
    referenceGenome === 'GRCh37'
      ? process.env.GRCH37_GENCODE_VERSION || 'v19'
      : process.env.GRCH38_GENCODE_VERSION || 'v29'
  const transcript = cloneDeep(
    gene.gencode[gencodeVersion].transcripts.find(tx => tx.transcript_id === transcriptId)
  )
  transcript.reference_genome = referenceGenome
  transcript.gene = shapeGene(gene, referenceGenome)

  return transcript
}

export const fetchTranscriptById = async (ctx, transcriptId, referenceGenome) => {
  const gencodeVersion =
    referenceGenome === 'GRCh37'
      ? process.env.GRCH37_GENCODE_VERSION || 'v19'
      : process.env.GRCH38_GENCODE_VERSION || 'v29'

  const response = await ctx.database.elastic.search({
    index: 'genes',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: [
            {
              nested: {
                path: `gencode.${gencodeVersion}.transcripts`,
                query: {
                  term: { [`gencode.${gencodeVersion}.transcripts.transcript_id`]: transcriptId },
                },
              },
            },
          ],
        },
      },
    },
    size: 1,
  })

  if (response.hits.total === 0) {
    throw new UserVisibleError('Transcript not found')
  }

  return shapeTranscript(response.hits.hits[0]._source, transcriptId, referenceGenome)
}
