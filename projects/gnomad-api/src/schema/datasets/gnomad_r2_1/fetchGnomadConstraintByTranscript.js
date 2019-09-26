import { UserVisibleError } from '../../errors'

const fetchGnomadConstraintByTranscript = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'gnomad_2_1_1_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError(`Constraint not found for transcript ${transcriptId}`)
    }
    throw err
  }
}

export default fetchGnomadConstraintByTranscript
