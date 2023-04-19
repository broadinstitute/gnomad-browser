import { UserVisibleError } from '../../errors'
import { fetchTranscriptById } from '../../queries/transcript-queries'

const resolveTranscript = async (_: any, args: any, ctx: any) => {
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

const resolvers = {
  Query: {
    transcript: resolveTranscript,
  },
}
export default resolvers
