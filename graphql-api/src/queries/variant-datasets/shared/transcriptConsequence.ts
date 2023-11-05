export const getConsequenceForContext = (context: any) => {
  switch (context.type) {
    case 'gene':
      return (variant: any) =>
        (variant.transcript_consequences || []).find((csq: any) => csq.gene_id === context.geneId)
    case 'region':
      return (variant: any) => (variant.transcript_consequences || [])[0]
    case 'transcript':
      return (variant: any) =>
        (variant.transcript_consequences || []).find(
          (csq: any) => csq.transcript_id === context.transcriptId
        )
    default:
      throw Error(`Invalid context for getConsequenceForContext: ${context.type}`)
  }
}
