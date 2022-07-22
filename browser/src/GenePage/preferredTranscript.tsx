import React from 'react'

import { ExternalLink } from '@gnomad/ui'

export const getPreferredTranscript = (gene: any) => {
  let preferredTranscriptId = null
  let preferredTranscriptDescription = null

  const hasManeSelectTranscript =
    gene.mane_select_transcript &&
    gene.transcripts.some(
      (transcript: any) => transcript.transcript_id === gene.mane_select_transcript.ensembl_id
    )

  if (hasManeSelectTranscript) {
    preferredTranscriptId = gene.mane_select_transcript.ensembl_id

    const maneSelectTranscriptMatchesVersion =
      !!gene.mane_select_transcript &&
      gene.transcripts.some(
        (transcript: any) =>
          transcript.transcript_id === gene.mane_select_transcript.ensembl_id &&
          transcript.transcript_version === gene.mane_select_transcript.ensembl_version
      )
    if (maneSelectTranscriptMatchesVersion) {
      preferredTranscriptDescription = (
        <React.Fragment>
          Transcript is the{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink> Select
          transcript for this gene
        </React.Fragment>
      )
    } else {
      preferredTranscriptDescription = (
        <React.Fragment>
          Transcript is a different version of the{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink> Select
          transcript for this gene
        </React.Fragment>
      )
    }
  } else {
    const hasCanonicalTranscript =
      gene.canonical_transcript_id &&
      gene.transcripts.some(
        (transcript: any) => transcript.transcript_id === gene.canonical_transcript_id
      )

    if (hasCanonicalTranscript) {
      preferredTranscriptId = gene.canonical_transcript_id
      preferredTranscriptDescription =
        'Transcript is the Ensembl canonical transcript for this gene'
    }
  }

  return { preferredTranscriptId, preferredTranscriptDescription }
}
