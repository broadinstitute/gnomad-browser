import { ReferenceGenome } from '@gnomad/dataset-metadata/metadata'
import { GetResponse, LimitedElasticClient } from '../elasticsearch'
import { getFromMultipleIndices } from './helpers/elasticsearch-helpers'

type TranscriptIndex =
  | 'transcripts_grch37'
  | 'transcripts_grch38'
  | 'transcripts_grch38_patched-2025-10-23--19-36'

const TRANSCRIPT_INDICES: Record<ReferenceGenome, TranscriptIndex[]> = {
  GRCh37: ['transcripts_grch37'],
  GRCh38: ['transcripts_grch38', 'transcripts_grch38_patched-2025-10-23--19-36'],
}

export const fetchTranscriptById = async (
  esClient: LimitedElasticClient,
  transcriptId: string,
  referenceGenome: ReferenceGenome
) => {
  const indices = TRANSCRIPT_INDICES[referenceGenome]
  const requests = indices.map(
    (index) =>
      esClient
        .get({
          index,
          type: '_doc',
          id: transcriptId,
        })
        .catch((err) => {
          // meta will not be present if the request times out in the queue before reaching ES
          if (err.meta && err.meta.body.found === false) {
            return null
          }
          throw err
        }) as Promise<GetResponse | null>
  )

  return getFromMultipleIndices(requests)
}
