import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

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

const fetchExonsByTranscriptId = (ctx, transcriptId) =>
  ctx.database.gnomad
    .collection('exons')
    .find({ transcript_id: transcriptId })
    .toArray()

export const fetchTranscriptById = async (ctx, transcriptId) => {
  const [transcript, exons] = await Promise.all([
    ctx.database.gnomad.collection('transcripts').findOne({ transcript_id: transcriptId }),
    fetchExonsByTranscriptId(ctx, transcriptId),
  ])

  if (!transcript) {
    throw new UserVisibleError('Transcript not found')
  }

  return { ...transcript, exons }
}

export const fetchTranscriptsByGene = async (ctx, gene) => {
  const transcripts = await ctx.database.gnomad
    .collection('transcripts')
    .find({ gene_id: gene.gene_id })
    .toArray()

  return Promise.all(
    transcripts.map(async transcript => {
      const exons = await fetchExonsByTranscriptId(ctx, transcript.transcript_id)
      return { ...transcript, exons }
    })
  )
}
