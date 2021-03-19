const TRANSCRIPT_INDICES = {
  GRCh37: 'transcripts_grch37',
  GRCh38: 'transcripts_grch38',
}

const fetchTranscriptById = async (es, transcriptId, referenceGenome) => {
  try {
    const response = await es.get({
      index: TRANSCRIPT_INDICES[referenceGenome],
      type: '_doc',
      id: transcriptId,
    })

    return response.body._source.value
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    if (err.meta && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

module.exports = {
  fetchTranscriptById,
}
