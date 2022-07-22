import { mean } from 'd3-array'

const sortedTranscripts = (transcripts: any, firstTranscriptId: any) => {
  return [...transcripts].sort((t1, t2) => {
    // Sort specified transcript first
    // Then sort transcripts by mean expression and transcript ID
    if (t1.transcript_id === firstTranscriptId) {
      return -1
    }
    if (t2.transcript_id === firstTranscriptId) {
      return 1
    }

    const t1Mean = mean(Object.values(t1.gtex_tissue_expression || {}))
    const t2Mean = mean(Object.values(t2.gtex_tissue_expression || {}))

    if (t1Mean === t2Mean) {
      return t1.transcript_id.localeCompare(t2.transcript_id)
    }

    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    return t2Mean - t1Mean
  })
}

export default sortedTranscripts
