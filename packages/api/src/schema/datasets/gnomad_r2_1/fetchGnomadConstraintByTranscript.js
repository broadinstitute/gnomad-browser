const fetchGnomadConstraintByTranscript = async (ctx, transcriptId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_constraint_2_1_1',
    type: 'constraint',
    body: {
      query: {
        bool: {
          filter: {
            term: { transcript_id: transcriptId },
          },
        },
      },
    },
    size: 1,
  })

  const doc = response.hits.hits[0]

  // eslint-disable-next-line no-underscore-dangle
  return doc ? doc._source : null
}

export default fetchGnomadConstraintByTranscript
