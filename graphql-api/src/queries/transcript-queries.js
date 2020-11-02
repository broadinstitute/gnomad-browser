const fetchTranscriptById = async (es, transcriptId, referenceGenome) => {
  try {
    const response = await es.get({
      index: `transcripts_${referenceGenome.toLowerCase()}`,
      type: '_doc',
      id: transcriptId,
    })

    return response.body._source.value
  } catch (err) {
    if (err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

module.exports = {
  fetchTranscriptById,
}
