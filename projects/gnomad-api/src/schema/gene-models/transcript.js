import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { cloneDeep } from 'lodash'

import { UserVisibleError } from '../errors'

import { ExonType } from './exon'

export const TranscriptType = new GraphQLObjectType({
  name: 'Transcript',
  fields: {
    transcript_id: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    exons: { type: new GraphQLNonNull(new GraphQLList(ExonType)) },
    strand: { type: new GraphQLNonNull(GraphQLString) },
    gene_id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const fetchTranscriptById = async (ctx, transcriptId) => {
  const response = await ctx.database.elastic.search({
    index: 'genes_grch37',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: [
            {
              nested: {
                path: 'transcripts',
                query: {
                  term: { 'transcripts.transcript_id': transcriptId },
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

  const gene = response.hits.hits[0]._source
  const transcript = cloneDeep(gene.transcripts.find(tx => tx.transcript_id === transcriptId))
  transcript.gene = gene

  return transcript
}
