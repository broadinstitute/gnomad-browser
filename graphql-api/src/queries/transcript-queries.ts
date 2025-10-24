import { catchNotFound } from '../elasticsearch'

const TRANSCRIPT_INDICES = {
  GRCh37: 'transcripts_grch37',
  GRCh38: 'transcripts_grch38',
}

export const fetchTranscriptById = async (es: any, transcriptId: any, referenceGenome: any) => {
  try {
    const response = await es.get({
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      index: TRANSCRIPT_INDICES[referenceGenome],
      type: '_doc',
      id: transcriptId,
    })

    return response.body._source.value
  } catch (err) {
    return catchNotFound(err)
  }
}
