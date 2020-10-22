const { UserVisibleError } = require('../../errors')
const { fetchTranscriptById } = require('../../queries/transcript-queries')

const resolveTranscript = async (_, args, ctx) => {
  const transcript = await fetchTranscriptById(
    ctx.esClient,
    args.transcript_id,
    args.reference_genome
  )

  if (!transcript) {
    throw new UserVisibleError('Transcript not found')
  }

  return transcript
}

module.exports = {
  Query: {
    transcript: resolveTranscript,
  },
}
