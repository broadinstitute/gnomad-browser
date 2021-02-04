import React from 'react'
import PropTypes from 'prop-types'

import AttributeList from '../AttributeList'
import InfoButton from '../help/InfoButton'
import InlineList from '../InlineList'
import Link from '../Link'

import GeneReferences from './GeneReferences'

const ManeSelectTranscriptId = ({ gene }) => {
  const gencodeVersionOfManeSelectTransript = gene.transcripts.find(
    transcript => transcript.transcript_id === gene.mane_select_transcript.ensembl_id
  )
  const shouldLinkToTranscriptPage =
    gencodeVersionOfManeSelectTransript &&
    gencodeVersionOfManeSelectTransript.transcript_version ===
      gene.mane_select_transcript.ensembl_version

  return (
    <React.Fragment>
      {shouldLinkToTranscriptPage ? (
        <Link to={`/transcript/${gene.mane_select_transcript.ensembl_id}`}>
          {gene.mane_select_transcript.ensembl_id}.{gene.mane_select_transcript.ensembl_version}
        </Link>
      ) : (
        `${gene.mane_select_transcript.ensembl_id}.${gene.mane_select_transcript.ensembl_version}`
      )}{' '}
      / {gene.mane_select_transcript.refseq_id}.{gene.mane_select_transcript.refseq_version}
    </React.Fragment>
  )
}

ManeSelectTranscriptId.propTypes = {
  gene: PropTypes.shape({
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
      ensembl_version: PropTypes.string.isRequired,
      refseq_id: PropTypes.string.isRequired,
      refseq_version: PropTypes.string.isRequired,
    }).isRequired,
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

const GeneInfo = ({ gene }) => {
  const canonicalTranscript = gene.canonical_transcript_id
    ? gene.transcripts.find(transcript => transcript.transcript_id === gene.canonical_transcript_id)
    : null

  const ucscReferenceGenomeId = gene.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const gencodeVersion = gene.reference_genome === 'GRCh37' ? '19' : '35'

  const otherTranscripts = gene.transcripts.filter(
    transcript =>
      transcript.transcript_id !== (canonicalTranscript || {}).transcript_id &&
      transcript.transcript_id !== (gene.mane_select_transcript || {}).ensembl_id
  )

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Genome build">
        {gene.reference_genome} / {ucscReferenceGenomeId}
      </AttributeList.Item>

      <AttributeList.Item label="Ensembl gene ID">
        {gene.gene_id}.{gene.gene_version}
      </AttributeList.Item>

      {gene.symbol !== gene.gencode_symbol && (
        <AttributeList.Item label={`Symbol in GENCODE v${gencodeVersion}`}>
          {gene.gencode_symbol}
        </AttributeList.Item>
      )}

      {gene.reference_genome === 'GRCh38' && (
        <AttributeList.Item
          label={
            <React.Fragment>
              MANE Select transcript <InfoButton topic="mane_select_transcript" />
            </React.Fragment>
          }
        >
          {gene.mane_select_transcript ? <ManeSelectTranscriptId gene={gene} /> : 'Not available'}
        </AttributeList.Item>
      )}

      <AttributeList.Item
        label={
          <React.Fragment>
            Ensembl canonical transcript <InfoButton topic="canonical_transcript" />
          </React.Fragment>
        }
      >
        {canonicalTranscript ? (
          <Link to={`/transcript/${canonicalTranscript.transcript_id}`}>
            {canonicalTranscript.transcript_id}.{canonicalTranscript.transcript_version}
          </Link>
        ) : (
          'Not available'
        )}
      </AttributeList.Item>

      {otherTranscripts.length > 0 && (
        <AttributeList.Item label="Other transcripts">
          <InlineList
            items={otherTranscripts.map(transcript => (
              <Link to={`/transcript/${transcript.transcript_id}`}>
                {transcript.transcript_id}.{transcript.transcript_version}
              </Link>
            ))}
            label="Other transcripts"
          />
        </AttributeList.Item>
      )}

      <AttributeList.Item label="Region">
        <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>
          {gene.chrom}:{gene.start}-{gene.stop}
        </Link>
      </AttributeList.Item>

      <AttributeList.Item label="External resources">
        <GeneReferences gene={gene} />
      </AttributeList.Item>
    </AttributeList>
  )
}

GeneInfo.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    gene_version: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    gencode_symbol: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    canonical_transcript_id: PropTypes.string,
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
      ensembl_version: PropTypes.string.isRequired,
      refseq_id: PropTypes.string.isRequired,
      refseq_version: PropTypes.string.isRequired,
    }),
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

export default GeneInfo
