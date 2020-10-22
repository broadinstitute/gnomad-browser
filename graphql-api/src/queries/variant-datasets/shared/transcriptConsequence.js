const getConsequenceForContext = (context) => {
  switch (context.type) {
    case 'gene':
      return (variant) =>
        (variant.transcript_consequences || []).find((csq) => csq.gene_id === context.geneId)
    case 'region':
      return (variant) => (variant.transcript_consequences || [])[0]
    case 'transcript':
      return (variant) =>
        (variant.transcript_consequences || []).find(
          (csq) => csq.transcript_id === context.transcriptId
        )
    default:
      throw Error(`Invalid context for getConsequenceForContext: ${context.type}`)
  }
}

module.exports = {
  getConsequenceForContext,
}
