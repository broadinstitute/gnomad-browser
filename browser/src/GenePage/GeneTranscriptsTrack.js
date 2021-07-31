import PropTypes from 'prop-types'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import TranscriptsTrack from '@gnomad/track-transcripts'
import { Button, Modal } from '@gnomad/ui'

import Link from '../Link'
import sortedTranscripts from './sortedTranscripts'
import TranscriptsTissueExpression from './TranscriptsTissueExpression'

const TranscriptsInfoWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
`

const TranscriptLabel = styled.span`
  font-size: 11px;
`

const GeneTranscriptsTrack = ({
  datasetId,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  preferredTranscriptId,
  preferredTranscriptDescription,
}) => {
  const transcriptsTrack = useRef(null)

  const [showTissueExpressionModal, setShowTissueExpressionModal] = useState(false)

  return (
    <>
      <Track>
        {() => (
          <TranscriptsInfoWrapper>
            <span>{preferredTranscriptDescription && <>* {preferredTranscriptDescription}</>}</span>
            <span>
              {gene.reference_genome === 'GRCh37' && (
                <Button
                  style={{ marginRight: '1ch' }}
                  onClick={() => {
                    setShowTissueExpressionModal(true)
                  }}
                >
                  Show transcript tissue expression
                </Button>
              )}
              <Button
                onClick={() => {
                  transcriptsTrack.current.downloadPlot(`${gene.gene_id}_transcripts`)
                }}
              >
                Save transcripts plot
              </Button>
            </span>
          </TranscriptsInfoWrapper>
        )}
      </Track>
      <TranscriptsTrack
        ref={transcriptsTrack}
        renderTranscriptLeftPanel={
          datasetId.startsWith('gnomad_sv')
            ? ({ transcript }) => (
                <TranscriptLabel>
                  {transcript.transcript_id}.{transcript.transcript_version}
                  {transcript.transcript_id === preferredTranscriptId && '*'}
                </TranscriptLabel>
              )
            : ({ transcript }) => (
                <TranscriptLabel>
                  <Link to={`/transcript/${transcript.transcript_id}`}>
                    {transcript.transcript_id}.{transcript.transcript_version}
                    {transcript.transcript_id === preferredTranscriptId && '*'}
                  </Link>
                </TranscriptLabel>
              )
        }
        showNonCodingTranscripts={includeNonCodingTranscripts}
        showUTRs={includeUTRs}
        transcripts={sortedTranscripts(gene.transcripts, preferredTranscriptId)}
      />
      {showTissueExpressionModal && (
        <Modal
          size="xlarge"
          title="Transcript tissue expression"
          onRequestClose={() => {
            setShowTissueExpressionModal(false)
          }}
        >
          <TranscriptsTissueExpression
            transcripts={gene.transcripts}
            includeNonCodingTranscripts={includeNonCodingTranscripts}
            preferredTranscriptId={preferredTranscriptId}
            preferredTranscriptDescription={preferredTranscriptDescription}
          />
        </Modal>
      )}
    </>
  )
}

GeneTranscriptsTrack.propTypes = {
  datasetId: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
        exons: PropTypes.arrayOf(
          PropTypes.shape({
            feature_type: PropTypes.string.isRequired,
            start: PropTypes.number.isRequired,
            stop: PropTypes.number.isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
    canonical_transcript_id: PropTypes.string,
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
      ensembl_version: PropTypes.string.isRequired,
    }),
  }).isRequired,
  includeNonCodingTranscripts: PropTypes.bool.isRequired,
  includeUTRs: PropTypes.bool.isRequired,
  preferredTranscriptId: PropTypes.string,
  preferredTranscriptDescription: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
}

GeneTranscriptsTrack.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default GeneTranscriptsTrack
