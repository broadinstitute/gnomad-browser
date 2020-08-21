const resolveTranscript = (_, args, ctx) => {
  return ctx.queryInternalAPI(`/${args.reference_genome}/transcript/${args.transcript_id}/`, {
    cacheKey: `transcript:${args.transcript_id}:${args.reference_genome}`,
    cacheExpiration: 3600,
  })
}

module.exports = {
  Query: {
    transcript: resolveTranscript,
  },
}
