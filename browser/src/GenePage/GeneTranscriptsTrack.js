import { max, mean } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import TranscriptsTrack from '@gnomad/track-transcripts'
import { Button, Modal, TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_NAMES } from '../gtex'
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

  const isTissueExpressionAvailable = gene.reference_genome === 'GRCh37'
  const [showTissueExpressionModal, setShowTissueExpressionModal] = useState(false)

  const maxMeanExpression = isTissueExpressionAvailable
    ? max(
        gene.transcripts.map(transcript => mean(Object.values(transcript.gtex_tissue_expression)))
      )
    : undefined

  return (
    <>
      <Track>
        {() => (
          <TranscriptsInfoWrapper>
            <span>{preferredTranscriptDescription && <>* {preferredTranscriptDescription}</>}</span>
            <span>
              {isTissueExpressionAvailable && (
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
        renderTranscriptRightPanel={
          !isTissueExpressionAvailable
            ? null
            : ({ transcript, width }) => {
                if (width < 36) {
                  return null
                }

                const meanExpression = mean(Object.values(transcript.gtex_tissue_expression))
                const maxExpression = max(Object.values(transcript.gtex_tissue_expression))
                const tissueMostExpressedIn = Object.keys(transcript.gtex_tissue_expression).find(
                  tissue => transcript.gtex_tissue_expression[tissue] === maxExpression
                )

                return (
                  <svg width={width} height={10}>
                    <TooltipAnchor
                      tooltip={`Mean expression across all tissues = ${meanExpression.toFixed(
                        2
                      )} TPM\nMost expressed in ${
                        GTEX_TISSUE_NAMES[tissueMostExpressedIn]
                      } (${maxExpression.toFixed(2)} TPM)`}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={30}
                        height={10}
                        fill="none"
                        pointerEvents="visible"
                      />
                    </TooltipAnchor>
                    <circle
                      cx={15}
                      cy={5}
                      r={Math.sqrt(
                        meanExpression === 0
                          ? 0
                          : 0.25 +
                              23.75 *
                                (maxMeanExpression === 0 ? 0 : meanExpression / maxMeanExpression)
                      )}
                      fill="#333"
                      pointerEvents="none"
                    />
                  </svg>
                )
              }
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
