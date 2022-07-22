import { max, mean } from 'd3-array'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import TranscriptsTrack from '@gnomad/track-transcripts'
import { Button, Modal, TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_NAMES } from '../gtex'
import InfoButton from '../help/InfoButton'
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

const RightPanel = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0.375em;
`

type OwnProps = {
  datasetId: string
  gene: {
    gene_id: string
    reference_genome: 'GRCh37' | 'GRCh38'
    transcripts: {
      transcript_id: string
      transcript_version: string
      exons: {
        feature_type: string
        start: number
        stop: number
      }[]
    }[]
    canonical_transcript_id?: string
    mane_select_transcript?: {
      ensembl_id: string
      ensembl_version: string
    }
  }
  includeNonCodingTranscripts: boolean
  includeUTRs: boolean
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof GeneTranscriptsTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'GeneTranscriptsTrack' implicitly has type 'any' b... Remove this comment to see the full error message
const GeneTranscriptsTrack = ({
  datasetId,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  preferredTranscriptId,
  preferredTranscriptDescription,
}: Props) => {
  const transcriptsTrack = useRef(null)

  const isTissueExpressionAvailable = gene.reference_genome === 'GRCh37'
  const [showTissueExpressionModal, setShowTissueExpressionModal] = useState(false)

  const maxMeanExpression = isTissueExpressionAvailable
    ? max(
        gene.transcripts.map((transcript: any) =>
          mean(Object.values(transcript.gtex_tissue_expression))
        )
      )
    : undefined

  return (
    <>
      <Track
        renderRightPanel={({ width }: any) => {
          return (
            width > 30 && (
              <RightPanel>
                <InfoButton topic="transcript-tissue-expression" />
              </RightPanel>
            )
          )
        }}
      >
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
                  // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
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
            ? ({ transcript }: any) => (
                <TranscriptLabel>
                  {transcript.transcript_id}.{transcript.transcript_version}
                  {transcript.transcript_id === preferredTranscriptId && '*'}
                </TranscriptLabel>
              )
            : ({ transcript }: any) => (
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
            : ({ transcript, width }: any) => {
                if (width < 36) {
                  return null
                }

                const meanExpression = mean(Object.values(transcript.gtex_tissue_expression))
                const maxExpression = max(Object.values(transcript.gtex_tissue_expression))
                const tissueMostExpressedIn = Object.keys(transcript.gtex_tissue_expression).find(
                  (tissue: any) => transcript.gtex_tissue_expression[tissue] === maxExpression
                )

                return (
                  <svg width={width} height={10}>
                    <TooltipAnchor
                      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
                      tooltip={`Mean expression across all tissues = ${meanExpression.toFixed(
                        2
                      )} TPM\nMost expressed in ${
                        // @ts-expect-error TS(2538) FIXME: Type 'undefined' cannot be used as an index type.
                        GTEX_TISSUE_NAMES[tissueMostExpressedIn]
                      } (${
                        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
                        maxExpression.toFixed(2)
                      } TPM)`}
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
                                // @ts-expect-error TS(2367) FIXME: This condition will always return 'false' since th... Remove this comment to see the full error message
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
          // @ts-expect-error TS(2820) FIXME: Type '"xlarge"' is not assignable to type '"small"... Remove this comment to see the full error message
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

GeneTranscriptsTrack.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default GeneTranscriptsTrack
