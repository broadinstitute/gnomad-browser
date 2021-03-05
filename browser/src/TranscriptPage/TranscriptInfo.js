import React from 'react'
import PropTypes from 'prop-types'

import { ExternalLink } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'
import InfoButton from '../help/InfoButton'

const TranscriptReferences = ({ transcript }) => {
  const {
    transcript_id: transcriptId,
    reference_genome: referenceGenome,
    chrom,
    start,
    stop,
  } = transcript

  const ensemblGeneUrl = `https://${
    referenceGenome === 'GRCh37' ? 'grch37.' : ''
  }ensembl.org/Homo_sapiens/Transcript/Summary?t=${transcriptId}`

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  return (
    <React.Fragment>
      <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>,{' '}
      <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
    </React.Fragment>
  )
}

TranscriptReferences.propTypes = {
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    transcript_version: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

const TranscriptInfo = ({ transcript }) => {
  const ucscReferenceGenomeId = transcript.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'

  const isManeSelectTranscript =
    transcript.transcript_id === (transcript.gene.mane_select_transcript || {}).ensembl_id
  const isCanonicalTranscript = transcript.transcript_id === transcript.gene.canonical_transcript_id

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Genome build">
        {transcript.reference_genome} / {ucscReferenceGenomeId}
      </AttributeList.Item>
      <AttributeList.Item label="Ensembl ID">
        {transcript.transcript_id}.{transcript.transcript_version}
      </AttributeList.Item>
      <AttributeList.Item label="Gene">
        <Link to={`/gene/${transcript.gene.gene_id}`}>
          {transcript.gene.symbol} ({transcript.gene.gene_id}.{transcript.gene.gene_version})
        </Link>
        {isManeSelectTranscript && (
          <>
            <br />
            This transcript is{' '}
            {transcript.transcript_version !==
              transcript.gene.mane_select_transcript.ensembl_version && 'a version of '}
            the MANE Select transcript for {transcript.gene.symbol}{' '}
            <InfoButton topic="mane-select-transcript" />
          </>
        )}
        {isCanonicalTranscript && (
          <>
            <br />
            This transcript is {isManeSelectTranscript && 'also '}the Ensembl canonical transcript
            for {transcript.gene.symbol} <InfoButton topic="canonical-transcript" />
          </>
        )}
      </AttributeList.Item>
      <AttributeList.Item label="Region">
        <Link to={`/region/${transcript.chrom}-${transcript.start}-${transcript.stop}`}>
          {transcript.chrom}:{transcript.start}-{transcript.stop}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="External resources">
        <TranscriptReferences transcript={transcript} />
      </AttributeList.Item>
    </AttributeList>
  )
}

TranscriptInfo.propTypes = {
  transcript: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    transcript_version: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
      gene_version: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      mane_select_transcript: PropTypes.shape({
        ensembl_id: PropTypes.string.isRequired,
        ensembl_version: PropTypes.string.isRequired,
      }),
      canonical_transcript_id: PropTypes.string,
    }).isRequired,
  }).isRequired,
}

export default TranscriptInfo
