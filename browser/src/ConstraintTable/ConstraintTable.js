import PropTypes from 'prop-types'
import React from 'react'

import Link from '../Link'

import ExacConstraintTable from './ExacConstraintTable'
import GnomadConstraintTable from './GnomadConstraintTable'

const ConstraintTable = ({ datasetId, geneOrTranscript }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return <p>Constraint not yet available for gnomAD v3.</p>
  }

  const isGene = geneOrTranscript.transcript_id === undefined

  let transcriptId
  let transcriptVersion
  let transcriptDescription
  if (isGene) {
    if (geneOrTranscript.mane_select_transcript) {
      transcriptId = geneOrTranscript.mane_select_transcript.ensembl_id
      transcriptVersion = geneOrTranscript.transcripts.find(
        transcript =>
          transcript.transcript_id === geneOrTranscript.mane_select_transcript.ensembl_id
      ).transcript_version
      transcriptDescription =
        transcriptVersion === geneOrTranscript.mane_select_transcript.ensembl_version
          ? 'MANE Select'
          : 'a version of MANE Select'
    } else {
      transcriptId = geneOrTranscript.canonical_transcript_id
      transcriptVersion = transcriptId
        ? geneOrTranscript.transcripts.find(transcript => transcript.transcript_id === transcriptId)
            .transcript_version
        : null
      transcriptDescription = 'Ensembl canonical'
    }
  } else {
    transcriptId = geneOrTranscript.transcript_id
    transcriptVersion = geneOrTranscript.transcript_version
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
      {['controls', 'non_neuro', 'non_cancer', 'non_topmed'].some(subset =>
        datasetId.includes(subset)
      ) && <p>Constraint is based on the full gnomAD dataset, not the selected subset.</p>}
      <GnomadConstraintTable constraint={gnomadConstraint} />
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

ConstraintTable.propTypes = {
  datasetId: PropTypes.string.isRequired,
  geneOrTranscript: PropTypes.oneOfType([
    PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      canonical_transcript_id: PropTypes.string,
      mane_select_transcript: PropTypes.shape({
        ensembl_id: PropTypes.string.isRequired,
        ensembl_version: PropTypes.string.isRequired,
      }),
      transcripts: PropTypes.arrayOf(
        PropTypes.shape({
          transcript_id: PropTypes.string.isRequired,
          transcript_version: PropTypes.string.isRequired,
        })
      ).isRequired,
      /* eslint-disable react/forbid-prop-types */
      gnomad_constraint: PropTypes.object,
      exac_constraint: PropTypes.object,
      /* eslint-enable react/forbid-prop-types */
    }),
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      transcript_version: PropTypes.string.isRequired,
      chrom: PropTypes.string.isRequired,
      /* eslint-disable react/forbid-prop-types */
      gnomad_constraint: PropTypes.object,
      exac_constraint: PropTypes.object,
      /* eslint-enable react/forbid-prop-types */
    }),
  ]).isRequired,
}

export default ConstraintTable
