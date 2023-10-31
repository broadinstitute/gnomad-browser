import React from 'react'

import { DatasetId, hasConstraints, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import { Gene } from '../GenePage/GenePage'
import { Transcript } from '../TranscriptPage/TranscriptPage'

import Link from '../Link'

import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

type Props = {
  datasetId: DatasetId
  geneOrTranscript: Gene | Transcript
}

const isGene = (geneOrTranscript: Gene | Transcript): geneOrTranscript is Gene =>
  (geneOrTranscript as any).transcript_id === undefined

const transcriptDetails = (
  geneOrTranscript: Gene | Transcript
): {
  transcriptId: string | null
  transcriptVersion: string | null
  transcriptDescription: string | null
} => {
  let transcriptId: string | null
  let transcriptVersion
  let transcriptDescription = null
  if (isGene(geneOrTranscript)) {
    if (geneOrTranscript.mane_select_transcript) {
      const maneSelectTranscript = geneOrTranscript.mane_select_transcript
      transcriptId = maneSelectTranscript.ensembl_id
      const matchingTranscript = geneOrTranscript.transcripts.find(
        (transcript) => transcript.transcript_id === maneSelectTranscript.ensembl_id
      )!
      transcriptVersion = matchingTranscript.transcript_version
      transcriptDescription =
        transcriptVersion === maneSelectTranscript.ensembl_version
          ? 'MANE Select'
          : 'a version of MANE Select'
    } else {
      transcriptId = geneOrTranscript.canonical_transcript_id
      const canonicalTranscript = transcriptId
        ? geneOrTranscript.transcripts.find(
            (transcript) => transcript.transcript_id === transcriptId
          )
        : null
      transcriptVersion = canonicalTranscript ? canonicalTranscript.transcript_version : null
      transcriptDescription = 'Ensembl canonical'
    }
  } else {
    transcriptId = geneOrTranscript.transcript_id
    transcriptVersion = geneOrTranscript.transcript_version
  }

  return { transcriptId, transcriptVersion, transcriptDescription }
}

const ConstraintTable = ({ datasetId, geneOrTranscript }: Props) => {
  if (!hasConstraints(datasetId)) {
    return <p>Constraint not yet available for {labelForDataset(datasetId)}.</p>
  }

  const { transcriptId, transcriptVersion, transcriptDescription } =
    transcriptDetails(geneOrTranscript)

  const gnomadConstraint = geneOrTranscript.gnomad_constraint
  const exacConstraint = geneOrTranscript.exac_constraint

  if (geneOrTranscript.chrom === 'M') {
    return (
      <p>
        Constraint is not available for mitochondrial{' '}
        {isGene(geneOrTranscript) ? 'genes' : 'transcripts'}
      </p>
    )
  }

  if (datasetId === 'exac') {
    if (!exacConstraint) {
      return (
        <p>Constraint not available for this {isGene(geneOrTranscript) ? 'gene' : 'transcript'}</p>
      )
    }
    return (
      <>
        <ExacConstraintTable constraint={exacConstraint} />
        {isGene(geneOrTranscript) && (
          <p>
            Constraint metrics based on {transcriptDescription} transcript (
            <Link to={`/transcript/${transcriptId}`}>
              {transcriptId}.{transcriptVersion}
            </Link>
            ).
          </p>
        )}
      </>
    )
  }

  if (!gnomadConstraint) {
    return (
      <p>Constraint not available for this {isGene(geneOrTranscript) ? 'gene' : 'transcript'}</p>
    )
  }

  return (
    <>
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some((subset) =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable constraint={gnomadConstraint} datasetId={datasetId} />
      {isGene(geneOrTranscript) && (
        <p style={{ marginBottom: 0 }}>
          Constraint metrics based on {transcriptDescription} transcript (
          <Link to={`/transcript/${transcriptId}`}>
            {transcriptId}.{transcriptVersion}
          </Link>
          ).
        </p>
      )}
    </>
  )
}

export default ConstraintTable
