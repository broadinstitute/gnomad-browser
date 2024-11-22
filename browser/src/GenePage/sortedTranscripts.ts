import { mean } from 'd3-array'

interface GenericTranscript {
  transcript_id: string
  gtex_tissue_expression:
    | {
        tissue: string
        value: number
      }[]
    | null
}

const sortedTranscripts = (
  transcripts: GenericTranscript[],
  firstTranscriptId: string | undefined
) => {
  return [...transcripts].sort((t1, t2) => {
    // Sort specified transcript first
    // Then sort transcripts by mean expression and transcript ID

    if (firstTranscriptId) {
      if (t1.transcript_id === firstTranscriptId) {
        return -1
      }
      if (t2.transcript_id === firstTranscriptId) {
        return 1
      }
    }

    const t1Mean = t1.gtex_tissue_expression
      ? mean(t1.gtex_tissue_expression.map((tissue) => tissue.value)) || 0
      : 0
    const t2Mean = t2.gtex_tissue_expression
      ? mean(t2.gtex_tissue_expression.map((tissue) => tissue.value)) || 0
      : 0

    if (t1Mean === t2Mean) {
      return t1.transcript_id.localeCompare(t2.transcript_id)
    }
    return t2Mean - t1Mean
  })
}

export default sortedTranscripts
