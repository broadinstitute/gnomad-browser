import React from 'react'

import { DatasetId, hasConstraints, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import { Gene } from '../GenePage/GenePage'
import { Transcript } from '../TranscriptPage/TranscriptPage'

import Link from '../Link'

import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable, { GnomadConstraint } from './GnomadConstraintTable'
import MitochondrialConstraintTable from './MitochondrialConstraintTable'

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

const noExpectedVariants = (gnomadConstraint: GnomadConstraint | null): boolean => {
  if (gnomadConstraint === null) {
    return true
  }
  const flags = gnomadConstraint.flags || []
  return flags.some((flag) => flag.startsWith('no_exp'))
}

const NoConstraintOnGeneOrTranscript = ({
  geneOrTranscript,
}: {
  geneOrTranscript: Gene | Transcript
}) => (
  <p>Constraint is not available for this {isGene(geneOrTranscript) ? 'gene' : 'transcript'}.</p>
)

const ConstraintTable = ({ datasetId, geneOrTranscript }: Props) => {
  if (!hasConstraints(datasetId)) {
    return <p>Constraint is not available for {labelForDataset(datasetId)}.</p>
  }

  const { transcriptId, transcriptVersion, transcriptDescription } =
    transcriptDetails(geneOrTranscript)

  if (geneOrTranscript.chrom === 'M') {
    if (isGene(geneOrTranscript)) {
      return (
        <MitochondrialConstraintTable
          constraint={geneOrTranscript.mitochondrial_constraint}
          transcript={geneOrTranscript.transcripts[0]}
        />
      )
    }
    return <p>Constraint is not available for mitochondrial transcripts.</p>
  }

  const gnomadConstraint = geneOrTranscript.gnomad_constraint
  const exacConstraint = geneOrTranscript.exac_constraint

  if (datasetId === 'exac') {
    if (!exacConstraint) {
      return <NoConstraintOnGeneOrTranscript geneOrTranscript={geneOrTranscript} />
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

  if (noExpectedVariants(gnomadConstraint)) {
    return <NoConstraintOnGeneOrTranscript geneOrTranscript={geneOrTranscript} />
  }

  return (
    <>
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some((subset) =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable constraint={gnomadConstraint!} />
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
