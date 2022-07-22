import React from 'react'

import Link from '../Link'

import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

type Props = {
  datasetId: string
  geneOrTranscript:
    | {
        chrom: string
        canonical_transcript_id?: string
        mane_select_transcript?: {
          ensembl_id: string
          ensembl_version: string
        }
        transcripts: {
          transcript_id: string
          transcript_version: string
        }[]
        gnomad_constraint?: any
        exac_constraint?: any
      }
    | {
        transcript_id: string
        transcript_version: string
        chrom: string
        gnomad_constraint?: any
        exac_constraint?: any
      }
}

const ConstraintTable = ({ datasetId, geneOrTranscript }: Props) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return <p>Constraint not yet available for gnomAD v3.</p>
  }

  const isGene = (geneOrTranscript as any).transcript_id === undefined

  let transcriptId: any
  let transcriptVersion
  let transcriptDescription
  if (isGene) {
    if ((geneOrTranscript as any).mane_select_transcript) {
      transcriptId = (geneOrTranscript as any).mane_select_transcript.ensembl_id
      transcriptVersion = (geneOrTranscript as any).transcripts.find(
        (transcript: any) =>
          transcript.transcript_id === (geneOrTranscript as any).mane_select_transcript.ensembl_id
      ).transcript_version
      transcriptDescription =
        transcriptVersion === (geneOrTranscript as any).mane_select_transcript.ensembl_version
          ? 'MANE Select'
          : 'a version of MANE Select'
    } else {
      transcriptId = (geneOrTranscript as any).canonical_transcript_id
      transcriptVersion = transcriptId
        ? (geneOrTranscript as any).transcripts.find(
            (transcript: any) => transcript.transcript_id === transcriptId
          ).transcript_version
        : null
      transcriptDescription = 'Ensembl canonical'
    }
  } else {
    transcriptId = (geneOrTranscript as any).transcript_id
    transcriptVersion = (geneOrTranscript as any).transcript_version
  }

  const gnomadConstraint = geneOrTranscript.gnomad_constraint
  const exacConstraint = geneOrTranscript.exac_constraint

  if (geneOrTranscript.chrom === 'M') {
    return <p>Constraint is not available for mitochondrial {isGene ? 'genes' : 'transcripts'}</p>
  }

  if (datasetId === 'exac') {
    if (!exacConstraint) {
      return <p>Constraint not available for this {isGene ? 'gene' : 'transcript'}</p>
    }
    return (
      <>
        <ExacConstraintTable constraint={exacConstraint} />
        {isGene && (
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
    return <p>Constraint not available for this {isGene ? 'gene' : 'transcript'}</p>
  }

  return (
    <>
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some((subset) =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable constraint={gnomadConstraint} />
      {isGene && (
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
