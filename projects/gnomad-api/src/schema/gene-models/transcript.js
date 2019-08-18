import { UserVisibleError } from '../errors'

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
